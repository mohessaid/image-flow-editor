import React, { useState, useCallback, useEffect } from "react";
import { Notification, NotificationGroup } from "@progress/kendo-react-notification";
import { Fade } from "@progress/kendo-react-animation";
import { Loader } from "@progress/kendo-react-indicators";

import FileUploader from "./components/FileUploader";
import FlowEditor from "./components/FlowEditor";
import OutputViewer from "./components/OutputViewer";
import Dashboard from "./components/Dashboard";
import { editImage } from "./services/geminiService";
import type { ImageFile, WorkflowNode, Connection, OutputImage, OperationLog } from "./types";

const SIMULATED_COST_PER_OP = 0.0025;
const SIMULATED_CREDITS_PER_OP = 1;

const App: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => {
    try {
      const savedNodes = localStorage.getItem('image-flow-editor-nodes');
      return savedNodes ? JSON.parse(savedNodes) : [];
    } catch (error) {
      console.error("Failed to parse saved nodes from localStorage", error);
      return [];
    }
  });
  const [connections, setConnections] = useState<Connection[]>(() => {
    try {
      const savedConnections = localStorage.getItem('image-flow-editor-connections');
      return savedConnections ? JSON.parse(savedConnections) : [];
    } catch (error) {
      console.error("Failed to parse saved connections from localStorage", error);
      return [];
    }
  });
  const [outputs, setOutputs] = useState<OutputImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'info', message: string} | null>(null);

  const [selectedTab, setSelectedTab] = useState(0);
  const [logs, setLogs] = useState<OperationLog[]>([]);

  useEffect(() => {
    try {
        const savedLogs = localStorage.getItem('image-flow-logs');
        setLogs(savedLogs ? JSON.parse(savedLogs) : []);
    } catch (error) {
        console.error("Failed to parse logs from localStorage", error);
        setLogs([]);
    }
  }, []);

  const addLogEntry = useCallback((logEntry: Omit<OperationLog, 'id' | 'timestamp'>) => {
    setLogs(prevLogs => {
        const newLog = { ...logEntry, id: crypto.randomUUID(), timestamp: Date.now() };
        const updatedLogs = [...prevLogs, newLog];
        try {
            localStorage.setItem('image-flow-logs', JSON.stringify(updatedLogs));
        } catch (e) {
            console.error("Failed to save log to localStorage", e);
        }
        return updatedLogs;
    });
  }, []);

  const clearLogs = useCallback(() => {
      setLogs([]);
      localStorage.removeItem('image-flow-logs');
      setNotification({ type: 'info', message: 'Dashboard data cleared.' });
  }, []);

  const handleFilesChange = (newFiles: ImageFile[]) => {
    setImages(newFiles);
    setOutputs([]); // Clear previous outputs when new images are uploaded
  };

  const getExecutionOrder = useCallback((): WorkflowNode[] | null => {
    if (nodes.length === 0) return [];
  
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
    nodes.forEach(node => {
      adj.set(node.id, []);
      inDegree.set(node.id, 0);
    });
  
    connections.forEach(conn => {
      adj.get(conn.fromNodeId)?.push(conn.toNodeId);
      inDegree.set(conn.toNodeId, (inDegree.get(conn.toNodeId) || 0) + 1);
    });
  
    const queue = nodes.filter(node => inDegree.get(node.id) === 0).map(node => node.id);
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
      setError("Workflow has a cycle or is disconnected. Please ensure all nodes form a single, valid flow from start to end.");
      return null;
    }
    setError(null);
    return sortedOrder;
  }, [nodes, connections]);

  const executeWorkflow = useCallback(async () => {
    setError(null);
    const workflow = getExecutionOrder();

    if (!workflow) return;
    if (images.length === 0) {
      setError("Please upload at least one image to run the workflow.");
      return;
    }
    if (workflow.length === 0) {
        setError("Please add at least one node to the workflow.");
        return;
    }

    setIsLoading(true);
    setOutputs([]); 
    
    for (const [imageIndex, image] of images.entries()) {
      let currentImageDataUrl = image.dataUrl;
      for (const [stepIndex, step] of workflow.entries()) {
        try {
          setLoadingMessage(`Processing Image ${imageIndex + 1}/${images.length} (${image.file.name})\nStep ${stepIndex + 1}/${workflow.length}: "${step.name}"`);
          
          const resultDataUrl = await editImage(currentImageDataUrl, step.prompt);
          currentImageDataUrl = resultDataUrl;
          
          addLogEntry({
              imageName: image.file.name,
              nodeName: step.name,
              status: 'success',
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
            setOutputs(prevOutputs => [...prevOutputs, newOutput]);
          }

        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
          setError(`Error on "${step.name}" for "${image.file.name}": ${errorMessage}`);
          addLogEntry({
              imageName: image.file.name,
              nodeName: step.name,
              status: 'failure',
              cost: 0,
              credits: 0,
          });
          setIsLoading(false);
          setLoadingMessage("");
          return; // Stop on first error
        }
      }
    }
    
    setIsLoading(false);
    setLoadingMessage("");
  }, [images, getExecutionOrder, addLogEntry]);

  const saveWorkflow = useCallback(() => {
    try {
      localStorage.setItem('image-flow-editor-nodes', JSON.stringify(nodes));
      localStorage.setItem('image-flow-editor-connections', JSON.stringify(connections));
      setNotification({ type: 'success', message: 'Workflow saved successfully!' });
    } catch (error) {
      setError("Failed to save workflow to local storage.");
      console.error("Error saving workflow:", error);
    }
  }, [nodes, connections]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setConnections([]);
    localStorage.removeItem('image-flow-editor-nodes');
    localStorage.removeItem('image-flow-editor-connections');
    setNotification({ type: 'info', message: 'Workflow cleared.' });
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
        <div className="inline-flex rounded-md shadow-sm bg-gray-800 p-1 border border-gray-700" role="group">
          <button
            type="button"
            onClick={() => setSelectedTab(0)}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ${
              selectedTab === 0
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab(1)}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ml-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ${
              selectedTab === 1
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Dashboard
          </button>
        </div>
      </div>

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
              />
            </div>
          </main>
        )}
        {selectedTab === 1 && <Dashboard logs={logs} onClear={clearLogs} />}
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
          <Loader size="large" type="infinite-spinner" />
          <p className="mt-4 text-white text-lg text-center whitespace-pre-wrap px-4">{loadingMessage}</p>
        </div>
      )}

      <NotificationGroup
        style={{ right: '10px', bottom: '10px', alignItems: 'flex-end', zIndex: 1000 }}
      >
        <Fade>
          {error && (
            <Notification
              type={{ style: 'error', icon: true }}
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