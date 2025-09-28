import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

// API key will be set dynamically
let ai: GoogleGenAI | null = null;

// Set the API key for the Gemini service
export const setApiKey = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("API key is required");
  }
  ai = new GoogleGenAI({ apiKey });
};

// Get current API key status
export const isApiKeySet = (): boolean => {
  return ai !== null;
};

// Helper to extract base64 data and mime type from a data URL
const parseDataUrl = (
  dataUrl: string,
): { base64Data: string; mimeType: string } => {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match || match.length !== 3) {
    throw new Error("Invalid data URL format");
  }
  return { mimeType: match[1], base64Data: match[2] };
};

// Simple sleep helper for backoff
const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * QuotaError
 * - Thrown when all preferred models are exhausted due to quota/rate limits.
 * - Includes optional details about which models failed.
 */
export class QuotaError extends Error {
  public details?: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = "QuotaError";
    this.details = details;
  }
}

/**
 * MODEL_PREFERENCES
 * - Order of models to attempt. The code will try each model in order if the
 *   previous one returns quota/rate-limit errors.
 * - Adjust this list to match models you have access to.
 */
const MODEL_PREFERENCES = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.5-flash-image-preview",
  "gemini-2.1-image-preview",
  "gemini-1.5-preview-image",
];

/**
 * attemptGenerate
 * - Single attempt to call generateContent for the specified model with retries/backoff on transient quota/rate errors.
 * - Supports an options bag with an AbortSignal to cancel and an onRetry callback to surface retry attempts to the caller/UI.
 * - Returns a small object indicating success and the data URL result when an image is produced.
 */
const attemptGenerate = async (
  model: string,
  base64Data: string,
  mimeType: string,
  prompt: string,
  options?: {
    signal?: AbortSignal;
    onRetry?: (attempt: number, delayMs: number, model: string) => void;
  },
): Promise<{ success: boolean; result?: string }> => {
  const MAX_RETRIES = 3;
  const INITIAL_DELAY_MS = 1000; // 1s
  const MAX_DELAY_MS = 30_000; // 30s

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= MAX_RETRIES) {
    try {
      // Respect early abort
      if (options?.signal?.aborted) {
        throw new Error("Request aborted");
      }

      const response: GenerateContentResponse =
        await ai!.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: prompt },
            ],
          },
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        });

      const candidate = response.candidates?.[0];

      // Comprehensive validation of the response
      if (
        !candidate ||
        !candidate.content?.parts ||
        candidate.content.parts.length === 0
      ) {
        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
          console.error(`Gemini API request blocked. Reason: ${blockReason}`);
          throw new Error(
            `Request blocked by safety policy: ${blockReason}. Please adjust the image or prompt.`,
          );
        }
        const finishReason = candidate?.finishReason;
        if (finishReason && finishReason !== "STOP") {
          console.error(
            `Gemini API generation stopped unexpectedly. Reason: ${finishReason}`,
          );
          throw new Error(`Image generation failed. Reason: ${finishReason}.`);
        }
        console.error(
          "Gemini API returned an empty or invalid response.",
          response,
        );
        throw new Error("API response did not contain an image.");
      }

      // Find the first image part in the response
      const imagePart = candidate.content.parts.find((part) => part.inlineData);

      if (imagePart?.inlineData) {
        const { mimeType: editedMimeType, data: editedImageBase64 } =
          imagePart.inlineData;
        return {
          success: true,
          result: `data:${editedMimeType};base64,${editedImageBase64}`,
        };
      }

      // If no image part is found, it's an error
      console.error(
        "No image data found in the successful API response.",
        response,
      );
      throw new Error("API response did not contain an image.");
    } catch (error: any) {
      lastError = error;
      attempt += 1;

      // Normalize message for detection
      const msg = error instanceof Error ? error.message : String(error);
      const isQuota =
        /quota|429|Too Many Requests|RESOURCE_EXHAUSTED|Quota exceeded/i.test(
          msg,
        );

      // Try to extract a server-suggested retry delay (e.g., "Please retry in 2.45s")
      let suggestedDelayMs: number | null = null;
      try {
        const retrySecondsMatch = msg.match(/retry in (\d+(\.\d+)?)s/i);
        if (retrySecondsMatch) {
          suggestedDelayMs = Math.round(
            parseFloat(retrySecondsMatch[1]) * 1000,
          );
        } else {
          const jsonMatch = msg.match(
            /\"retryDelay\"\s*:\s*\"?(\\?\d+\.?\d*)s\"?/i,
          );
          if (jsonMatch) {
            suggestedDelayMs = Math.round(parseFloat(jsonMatch[1]) * 1000);
          }
        }
      } catch (e) {
        // ignore parsing errors
      }

      // If quota/rate limit and we still have retry attempts, wait and retry with backoff
      if (isQuota && attempt <= MAX_RETRIES) {
        const backoff =
          suggestedDelayMs ??
          Math.min(INITIAL_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);

        // Notify caller/UI about the upcoming retry
        try {
          options?.onRetry?.(attempt, backoff, model);
        } catch (e) {
          // swallow onRetry errors
        }

        console.warn(
          `Gemini API quota/rate limit detected for model "${model}" (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${backoff}ms. Message:`,
          msg,
        );

        // Respect abort between retries
        if (options?.signal?.aborted) {
          throw new Error("Request aborted");
        }

        await sleep(backoff);

        // Check abort again immediately after sleep
        if (options?.signal?.aborted) {
          throw new Error("Request aborted");
        }

        continue;
      }

      // If it's a quota error and we've exhausted retries for this model, let caller know
      if (isQuota) {
        console.error(
          `Quota/rate limit for model "${model}" (no more retries)`,
          msg,
          error,
        );
        // Return a failure marker indicating quota for this model
        return { success: false, result: undefined };
      }

      // Non-quota error: propagate as a thrown error
      console.error("Non-quota error during Gemini API call:", error);
      if (error instanceof Error) {
        throw new Error(`AI processing failed: ${error.message}`);
      } else {
        throw new Error(
          "An unknown error occurred while communicating with the AI.",
        );
      }
    }
  }

  // After retries exhausted without a quota determination, return failure
  console.error(
    `Model "${model}" failed after ${MAX_RETRIES} retries:`,
    lastError,
  );
  return { success: false };
};

/**
 * editImage
 * - Tries multiple models in MODEL_PREFERENCES order when quota/rate limits occur.
 * - Throws QuotaError when no model can succeed due to quota restrictions.
 */
export const editImage = async (
  base64ImageDataUrl: string,
  prompt: string,
  options?: {
    signal?: AbortSignal;
    onRetry?: (attempt: number, delayMs: number, model: string) => void;
  },
): Promise<string> => {
  if (!ai) {
    throw new Error(
      "API key not configured. Please set your Gemini API key in the settings.",
    );
  }

  // Respect an early abort
  if (options?.signal?.aborted) {
    throw new Error("Request aborted");
  }

  const { base64Data, mimeType } = parseDataUrl(base64ImageDataUrl);

  const modelFailures: Record<string, any> = {};
  for (const model of MODEL_PREFERENCES) {
    try {
      const attempt = await attemptGenerate(
        model,
        base64Data,
        mimeType,
        prompt,
        options,
      );
      if (attempt.success && attempt.result) {
        return attempt.result;
      }
      // mark this model as quota-limited / failed and try next
      modelFailures[model] = { reason: "quota_or_rate_limit_or_no_result" };
      // small pause before trying next model to avoid immediate retries
      // allow caller to abort during the short pause
      if (options?.signal?.aborted) {
        throw new Error("Request aborted");
      }
      await sleep(250);
      if (options?.signal?.aborted) {
        throw new Error("Request aborted");
      }
      continue;
    } catch (err: any) {
      // If it was a non-quota fatal error, propagate it
      if (err instanceof QuotaError) {
        modelFailures[model] = { reason: "quota", details: err.details };
        continue;
      }
      // If the user aborted, surface a clear abort error
      if (err && err.message === "Request aborted") {
        throw err;
      }
      // Re-throw for unexpected errors
      throw err;
    }
  }

  // If we reach here, none of the models produced an image (likely quota)
  const helpUrl = "https://ai.google.dev/gemini-api/docs/rate-limits";
  const message =
    `All attempted Gemini models were unavailable due to quota/rate-limits or returned no image. ` +
    `Please check your Google Cloud billing, ensure the Generative AI API is enabled, and verify model-specific quotas. See: ${helpUrl}`;

  throw new QuotaError(message, { modelFailures });
};
