import React, { useState, useCallback, useEffect } from "react";
import {
  Notification,
  NotificationGroup,
} from "@progress/kendo-react-notification";
import { Fade } from "@progress/kendo-react-animation";
import { Loader } from "@progress/kendo-react-indicators";
import { Button } from "@progress/kendo-react-buttons";

import FileUploader from "./components/FileUploader";
import FlowEditor from "./components/FlowEditor";
import OutputViewer from "./components/OutputViewer";
import Dashboard from "./components/Dashboard";
import ApiKeyConfig from "./components/ApiKeyConfig";
import ApiKeyInstructions from "./components/ApiKeyInstructions";
import {
  editImage,
  setApiKey,
  isApiKeySet,
  QuotaError,
} from "./services/geminiService";
import type {
  ImageFile,
  WorkflowNode,
  Connection,
  OutputImage,
  OperationLog,
} from "./types";

const SIMULATED_COST_PER_OP = 0.0025;
const SIMULATED_CREDITS_PER_OP = 1;

const App: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => {
    try {
      const savedNodes = localStorage.getItem("image-flow-editor-nodes");
      return savedNodes ? JSON.parse(savedNodes) : [];
    } catch (error) {
      console.error("Failed to parse saved nodes from localStorage", error);
      return [];
    }
  });
  const [connections, setConnections] = useState<Connection[]>(() => {
    try {
      const savedConnections = localStorage.getItem(
        "image-flow-editor-connections",
      );
      return savedConnections ? JSON.parse(savedConnections) : [];
    } catch (error) {
      console.error(
        "Failed to parse saved connections from localStorage",
        error,
      );
      return [];
    }
  });
  const [outputs, setOutputs] = useState<OutputImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "info";
    message: string;
  } | null>(null);

  // Abort controller for cancelling in-progress workflow runs
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // Informational state to show retry attempts/backoff to the user
  const [retryInfo, setRetryInfo] = useState<{
    model?: string;
    attempt?: number;
    backoffMs?: number;
  } | null>(null);

  const [selectedTab, setSelectedTab] = useState(0);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [apiKey, setApiKeyState] = useState<string>("");
  const [isApiKeyConfigOpen, setIsApiKeyConfigOpen] = useState(false);

  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem("image-flow-logs");
      setLogs(savedLogs ? JSON.parse(savedLogs) : []);
    } catch (error) {
      console.error("Failed to parse logs from localStorage", error);
      setLogs([]);
    }

    // Load API key from localStorage
    try {
      const savedApiKey = localStorage.getItem("gemini-api-key");
      if (savedApiKey) {
        setApiKeyState(savedApiKey);
        setApiKey(savedApiKey);
      }
    } catch (error) {
      console.error("Failed to load API key from localStorage", error);
    }
  }, []);

  const addLogEntry = useCallback(
    (logEntry: Omit<OperationLog, "id" | "timestamp">) => {
      setLogs((prevLogs) => {
        const newLog = {
          ...logEntry,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        const updatedLogs = [...prevLogs, newLog];
        try {
          localStorage.setItem("image-flow-logs", JSON.stringify(updatedLogs));
        } catch (e) {
          console.error("Failed to save log to localStorage", e);
        }
        return updatedLogs;
      });
    },
    [],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem("image-flow-logs");
    setNotification({ type: "info", message: "Dashboard data cleared." });
  }, []);

  const handleApiKeyChange = useCallback((newApiKey: string) => {
    setApiKeyState(newApiKey);
    try {
      if (newApiKey) {
        localStorage.setItem("gemini-api-key", newApiKey);
        setApiKey(newApiKey);
      } else {
        localStorage.removeItem("gemini-api-key");
      }
    } catch (error) {
      console.error("Failed to save API key to localStorage", error);
      setError("Failed to save API key. Please try again.");
    }
  }, []);

  const handleFilesChange = (newFiles: ImageFile[]) => {
    setImages(newFiles);
    setOutputs([]); // Clear previous outputs when new images are uploaded
  };

  const getExecutionOrder = useCallback((): WorkflowNode[] | null => {
    if (nodes.length === 0) return [];

    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    nodes.forEach((node) => {
      adj.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    connections.forEach((conn) => {
      adj.get(conn.fromNodeId)?.push(conn.toNodeId);
      inDegree.set(conn.toNodeId, (inDegree.get(conn.toNodeId) || 0) + 1);
    });

    const queue = nodes
      .filter((node) => inDegree.get(node.id) === 0)
      .map((node) => node.id);
    const sortedOrder: WorkflowNode[] = [];

    while (queue.length > 0) {
      const u = queue.shift()!;
      const node = nodeMap.get(u);
      if (node) sortedOrder.push(node);

      for (const v of adj.get(u) || []) {
        inDegree.set(v, (inDegree.get(v) || 1) - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      }
    }

    if (sortedOrder.length !== nodes.length) {
      setError(
        "Workflow has a cycle or is disconnected. Please ensure all nodes form a single, valid flow from start to end.",
      );
      return null;
    }
    setError(null);
    return sortedOrder;
  }, [nodes, connections]);

  const executeWorkflow = useCallback(async () => {
    setError(null);
    const workflow = getExecutionOrder();

    if (!workflow) return;
    if (!isApiKeySet()) {
      setError(
        "Please configure your Gemini API key before running the workflow.",
      );
      return;
    }
    if (images.length === 0) {
      setError("Please upload at least one image to run the workflow.");
      return;
    }
    if (workflow.length === 0) {
      setError("Please add at least one node to the workflow.");
      return;
    }

    // Prepare abort controller for this run
    const controller = new AbortController();
    setAbortController(controller);
    setRetryInfo(null);

    setIsLoading(true);
    setOutputs([]);

    try {
      for (const [imageIndex, image] of images.entries()) {
        // Respect external abort between images
        if (controller.signal.aborted) throw new Error("Request aborted");

        let currentImageDataUrl = image.dataUrl;
        for (const [stepIndex, step] of workflow.entries()) {
          try {
            setLoadingMessage(
              `Processing Image ${imageIndex + 1}/${images.length} (${image.file.name})\nStep ${stepIndex + 1}/${workflow.length}: "${step.name}"`,
            );

            // Call editImage with abort signal and onRetry callback so UI can surface retries
            const resultDataUrl = await editImage(
              currentImageDataUrl,
              step.prompt,
              {
                signal: controller.signal,
                onRetry: (attempt: number, delayMs: number, model: string) => {
                  const info = { model, attempt, backoffMs: delayMs };
                  setRetryInfo(info);
                  setLoadingMessage(
                    `Retrying model ${model} (attempt ${attempt}) — waiting ${Math.ceil(delayMs / 1000)}s...`,
                  );
                  // Also show a non-intrusive notification so the user knows retry is happening
                  setNotification({
                    type: "info",
                    message: `Retrying ${model} (attempt ${attempt}) — will retry in ${Math.ceil(
                      delayMs / 1000,
                    )}s. You can cancel the run.`,
                  });
                },
              },
            );
            currentImageDataUrl = resultDataUrl;

            // Clear retry info after a successful call
            setRetryInfo(null);

            addLogEntry({
              imageName: image.file.name,
              nodeName: step.name,
              status: "success",
              cost: SIMULATED_COST_PER_OP,
              credits: SIMULATED_CREDITS_PER_OP,
            });

            if (stepIndex === workflow.length - 1) {
              const newOutput: OutputImage = {
                id: crypto.randomUUID(),
                originalImageId: image.id,
                originalFileName: image.file.name,
                dataUrl: currentImageDataUrl,
              };
              setOutputs((prevOutputs) => [...prevOutputs, newOutput]);
            }
          } catch (e) {
            const errorMessage =
              e instanceof Error ? e.message : "An unknown error occurred.";

            // If the user aborted the run:
            if (
              e &&
              ((e as any).name === "AbortError" ||
                errorMessage === "Request aborted")
            ) {
              // Surface a cancel notification and stop processing
              setNotification({
                type: "info",
                message: "Workflow cancelled by user.",
              });
              setIsLoading(false);
              setLoadingMessage("");
              setAbortController(null);
              setRetryInfo(null);
              return;
            }

            // If this is a quota / rate-limit error coming from the Gemini service,
            // show a friendly, actionable message with a link to the rate limit docs.
            if (
              e instanceof QuotaError ||
              (e && (e as any).name === "QuotaError")
            ) {
              const helpUrl =
                "https://ai.google.dev/gemini-api/docs/rate-limits";
              setError(
                `Quota exceeded while processing "${step.name}" for "${image.file.name}". Please check your Google Cloud billing and Gemini API quotas: ${helpUrl}`,
              );
              // Also surface a short notification so it's visible in the UI
              setNotification({
                type: "info",
                message: `Quota/rate-limit reached. See ${helpUrl}`,
              });
            } else {
              setError(
                `Error on "${step.name}" for "${image.file.name}": ${errorMessage}`,
              );
            }

            addLogEntry({
              imageName: image.file.name,
              nodeName: step.name,
              status: "failure",
              cost: 0,
              credits: 0,
            });

            // Clean up and stop on first error
            setIsLoading(false);
            setLoadingMessage("");
            setAbortController(null);
            setRetryInfo(null);
            return; // Stop on first error
          }
        }
      }
    } finally {
      // Final cleanup
      setIsLoading(false);
      setLoadingMessage("");
      setAbortController(null);
      // do not clobber retryInfo here so user can see last retry message if needed
    }
  }, [images, getExecutionOrder, addLogEntry]);

  const saveWorkflow = useCallback(() => {
    try {
      localStorage.setItem("image-flow-editor-nodes", JSON.stringify(nodes));
      localStorage.setItem(
        "image-flow-editor-connections",
        JSON.stringify(connections),
      );
      setNotification({
        type: "success",
        message: "Workflow saved successfully!",
      });
    } catch (error) {
      setError("Failed to save workflow to local storage.");
      console.error("Error saving workflow:", error);
    }
  }, [nodes, connections]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setConnections([]);
    localStorage.removeItem("image-flow-editor-nodes");
    localStorage.removeItem("image-flow-editor-connections");
    setNotification({ type: "info", message: "Workflow cleared." });
  }, []);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
          Image Flow Editor
        </h1>
        <p className="mt-2 text-lg text-gray-300">
          Build powerful AI-driven image editing workflows with a visual editor.
        </p>
      </header>

      <div className="flex justify-center mb-8">
        <div
          className="inline-flex rounded-md shadow-sm bg-gray-800 p-1 border border-gray-700"
          role="group"
        >
          <button
            type="button"
            onClick={() => setSelectedTab(0)}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ${
              selectedTab === 0
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab(1)}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ml-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ${
              selectedTab === 1
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab(2)}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ml-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ${
              selectedTab === 2
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            Instructions
          </button>
        </div>
      </div>

      {/* API Key Status Banner */}
      {!apiKey && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-yellow-400 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 className="text-yellow-300 font-medium">
                  API Key Required
                </h3>
                <p className="text-yellow-200 text-sm">
                  You need to configure your Gemini API key to use image editing
                  features.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsApiKeyConfigOpen(true)}
              themeColor="primary"
              size="medium"
            >
              Configure API Key
            </Button>
          </div>
        </div>
      )}

      {/* API Key Configured Banner */}
      {apiKey && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-green-400 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-green-300 font-medium">
                  API Key Configured
                </h3>
                <p className="text-green-200 text-sm">
                  Your Gemini API key is ready. You can now process images with
                  AI.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsApiKeyConfigOpen(true)}
              fillMode="outline"
              size="medium"
            >
              Update Key
            </Button>
          </div>
        </div>
      )}

      <div className="animate-fade-in">
        {selectedTab === 0 && (
          <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-8">
              <FileUploader onFilesChange={handleFilesChange} />
              <OutputViewer outputs={outputs} isLoading={isLoading} />
            </div>
            <div className="lg:col-span-3">
              <FlowEditor
                nodes={nodes}
                connections={connections}
                onNodesChange={setNodes}
                onConnectionsChange={setConnections}
                onExecute={executeWorkflow}
                isExecuting={isLoading}
                hasImages={images.length > 0}
                onSave={saveWorkflow}
                onClear={clearWorkflow}
                onOpenApiKeyConfig={() => setIsApiKeyConfigOpen(true)}
              />
            </div>
          </main>
        )}
        {selectedTab === 1 && <Dashboard logs={logs} onClear={clearLogs} />}
        {selectedTab === 2 && (
          <ApiKeyInstructions
            onOpenApiKeyConfig={() => setIsApiKeyConfigOpen(true)}
          />
        )}
      </div>

      <ApiKeyConfig
        isOpen={isApiKeyConfigOpen}
        onClose={() => setIsApiKeyConfigOpen(false)}
        onApiKeyChange={handleApiKeyChange}
        currentApiKey={apiKey}
      />

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 backdrop-blur-sm p-4">
          <Loader size="large" type="infinite-spinner" />
          <p className="mt-4 text-white text-lg text-center whitespace-pre-wrap px-4 max-w-xl">
            {loadingMessage}
          </p>

          {retryInfo && (
            <div className="mt-4 text-sm text-gray-200 text-center max-w-md">
              <div>
                Retrying model:{" "}
                <span className="font-semibold">{retryInfo.model}</span>
              </div>
              <div>
                Attempt:{" "}
                <span className="font-semibold">{retryInfo.attempt}</span>
                {" — "}
                Waiting:{" "}
                <span className="font-semibold">
                  {Math.ceil((retryInfo.backoffMs || 0) / 1000)}s
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 flex space-x-3">
            <Button
              onClick={() => {
                if (abortController) {
                  abortController.abort();
                }
                setNotification({
                  type: "info",
                  message: "Cancelling workflow...",
                });
                // Will be cleaned up by executeWorkflow's abort handling
              }}
              themeColor="warning"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Provide a way to view the logs area (if available) and the error message
                setNotification({
                  type: "info",
                  message: "Check the browser console for detailed logs.",
                });
              }}
              fillMode="outline"
            >
              View Logs
            </Button>
          </div>
        </div>
      )}

      <NotificationGroup
        style={{
          right: "10px",
          bottom: "10px",
          alignItems: "flex-end",
          zIndex: 1000,
        }}
      >
        <Fade>
          {error && (
            <Notification
              type={{ style: "error", icon: true }}
              closable={true}
              onClose={() => setError(null)}
            >
              <span className="font-bold">Workflow Error</span>
              <br />
              <span>{error}</span>
            </Notification>
          )}
        </Fade>
        <Fade>
          {notification && (
            <Notification
              type={{ style: notification.type, icon: true }}
              closable={true}
              onClose={() => setNotification(null)}
            >
              <span>{notification.message}</span>
            </Notification>
          )}
        </Fade>
      </NotificationGroup>
    </div>
  );
};

export default App;
