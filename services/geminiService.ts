import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Helper to extract base64 data and mime type from a data URL
const parseDataUrl = (dataUrl: string): { base64Data: string; mimeType: string } => {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match || match.length !== 3) {
    throw new Error('Invalid data URL format');
  }
  return { mimeType: match[1], base64Data: match[2] };
};

export const editImage = async (base64ImageDataUrl: string, prompt: string): Promise<string> => {
  try {
    const { base64Data, mimeType } = parseDataUrl(base64ImageDataUrl);

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const candidate = response.candidates?.[0];

    // Comprehensive validation of the response
    if (!candidate || !candidate.content?.parts || candidate.content.parts.length === 0) {
      const blockReason = response.promptFeedback?.blockReason;
      if (blockReason) {
        console.error(`Gemini API request blocked. Reason: ${blockReason}`);
        throw new Error(`Request blocked by safety policy: ${blockReason}. Please adjust the image or prompt.`);
      }
      const finishReason = candidate?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.error(`Gemini API generation stopped unexpectedly. Reason: ${finishReason}`);
        throw new Error(`Image generation failed. Reason: ${finishReason}.`);
      }
      console.error('Gemini API returned an empty or invalid response.', response);
      throw new Error('API returned an empty response. No image was generated.');
    }

    // Find the first image part in the response
    const imagePart = candidate.content.parts.find(part => part.inlineData);

    if (imagePart?.inlineData) {
      const { mimeType: editedMimeType, data: editedImageBase64 } = imagePart.inlineData;
      return `data:${editedMimeType};base64,${editedImageBase64}`;
    }

    // If no image part is found, it's an error
    console.error('No image data found in the successful API response.', response);
    throw new Error('API response received, but it did not contain an image. The model may have only returned text.');

  } catch (error) {
    console.error('Error during Gemini API call:', error);
    // Re-throw a user-friendly error, preserving the original message
    if (error instanceof Error) {
      throw new Error(`AI processing failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred while communicating with the AI.');
  }
};
