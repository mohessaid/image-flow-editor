import React, { useState, useRef, useMemo } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Dialog, DialogActionsBar } from "@progress/kendo-react-dialogs";
import Node from "./Node";
import AddStepModal from "./AddStepModal";
import type { WorkflowNode, Connection } from "../types";

interface FlowEditorProps {
  nodes: WorkflowNode[];
  connections: Connection[];
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onConnectionsChange: (connections: Connection[]) => void;
  onExecute: () => void;
  isExecuting: boolean;
  hasImages: boolean;
  onSave: () => void;
  onClear: () => void;
}

const FlowEditor: React.FC<FlowEditorProps> = ({
  nodes, connections, onNodesChange, onConnectionsChange, onExecute, isExecuting, hasImages,
  onSave, onClear
}) => {
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNode, setDraggingNode] = useState<{ id: string, offset: { x: number, y: number } } | null>(null);
  const [connecting, setConnecting] = useState<{ fromNodeId: string; toMouse: { x: number, y: number } } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
  const socketRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const addNode = (step: Omit<WorkflowNode, 'position' | 'id'>) => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const offset = (nodes.length % 10) * 20;
    onNodesChange([...nodes, {
      ...step, id: crypto.randomUUID(),
      position: { x: ((canvasBounds?.width || 800) / 2 - 125) + offset, y: 50 + offset },
    }]);
  };
  
  const requestRemoveNode = (id: string) => {
    setNodeToDelete(id);
  };

  const handleConfirmRemove = () => {
    if (!nodeToDelete) return;
    onNodesChange(nodes.filter(node => node.id !== nodeToDelete));
    onConnectionsChange(connections.filter(conn => conn.fromNodeId !== nodeToDelete && conn.toNodeId !== nodeToDelete));
    if (selectedNodeId === nodeToDelete) setSelectedNodeId(null);
    setNodeToDelete(null);
  };
  
  const handleCancelRemove = () => setNodeToDelete(null);
  
  const handleNodeMouseDown = (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!node || !canvasRect) return;
    setDraggingNode({
      id: nodeId,
      offset: { x: e.clientX - node.position.x - canvasRect.left, y: e.clientY - node.position.y - canvasRect.top }
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const mousePos = { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top };

    if (draggingNode) {
      onNodesChange(nodes.map(n => 
        n.id === draggingNode.id ? { ...n, position: { x: mousePos.x - draggingNode.offset.x, y: mousePos.y - draggingNode.offset.y } } : n
      ));
    } else if (connecting) {
      setConnecting({ ...connecting, toMouse: mousePos });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNode(null);
    setConnecting(null);
  };
  
  const handleStartConnection = (fromNodeId: string) => {
      const fromSocket = socketRefs.current.get(`${fromNodeId}-output`);
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!fromSocket || !canvasRect) return;
      const r = fromSocket.getBoundingClientRect();
      setConnecting({
        fromNodeId,
        toMouse: { x: r.x - canvasRect.left + r.width/2, y: r.y - canvasRect.top + r.height/2 }
      });
  };

  const handleEndConnection = (toNodeId: string) => {
    if (connecting && connecting.fromNodeId !== toNodeId) {
      const alreadyExists = connections.some(c => c.fromNodeId === connecting.fromNodeId && c.toNodeId === toNodeId);
      if (!alreadyExists) {
        onConnectionsChange([...connections, { id: crypto.randomUUID(), fromNodeId: connecting.fromNodeId, toNodeId }]);
      }
    }
    setConnecting(null);
  };

  const getCurvePath = (fromPos: {x: number, y: number}, toPos: {x: number, y: number}): string => {
    const dx = toPos.x - fromPos.x;
    const handleOffset = Math.max(75, Math.abs(dx) * 0.5);
    return `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + handleOffset} ${fromPos.y}, ${toPos.x - handleOffset} ${toPos.y}, ${toPos.x} ${toPos.y}`;
  };

  const connectionPaths = useMemo(() => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return [];
    return connections.map(conn => {
      const fromSocket = socketRefs.current.get(`${conn.fromNodeId}-output`);
      const toSocket = socketRefs.current.get(`${conn.toNodeId}-input`);
      if (!fromSocket || !toSocket) return null;
      const fromRect = fromSocket.getBoundingClientRect();
      const toRect = toSocket.getBoundingClientRect();
      const fromPos = { x: fromRect.x - canvasRect.x + fromRect.width / 2, y: fromRect.y - canvasRect.y + fromRect.height / 2 };
      const toPos = { x: toRect.x - canvasRect.x + toRect.width / 2, y: toRect.y - canvasRect.y + toRect.height / 2 };
      return <path key={conn.id} d={getCurvePath(fromPos, toPos)} stroke="#4f46e5" strokeWidth="2.5" fill="none" />;
    }).filter(Boolean);
  }, [connections, nodes]);

  const connectingPath = useMemo(() => {
    if (!connecting) return null;
    const fromSocket = socketRefs.current.get(`${connecting.fromNodeId}-output`);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!fromSocket || !canvasRect) return null;
    const r = fromSocket.getBoundingClientRect();
    const fromPos = { x: r.x - canvasRect.x + r.width / 2, y: r.y - canvasRect.y + r.height / 2 };
    return <path d={getCurvePath(fromPos, connecting.toMouse)} stroke="#a5b4fc" strokeWidth="2" strokeDasharray="6,4" fill="none" />;
  }, [connecting]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
      requestRemoveNode(selectedNodeId);
    }
  };

  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-lg h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-gray-600 pb-2 mb-4">
        <h2 className="text-xl font-bold text-gray-200">2. Define Workflow</h2>
        <div className="flex items-center space-x-2">
            <Button icon="save" onClick={onSave} title="Save Workflow">Save</Button>
            <Button icon="delete" onClick={onClear} title="Clear Workflow">Clear</Button>
            <div className="w-px h-6 bg-gray-600 mx-1"></div>
            <Button icon="plus" themeColor="primary" onClick={() => setIsAddPanelOpen(true)}>Add Node</Button>
            <Button icon="play-circle" themeColor="success" onClick={onExecute} disabled={isExecuting || nodes.length === 0 || !hasImages}>
              {isExecuting ? 'Executing...' : 'Execute Workflow'}
            </Button>
        </div>
      </div>
      <div className="flex-grow relative overflow-hidden rounded-md">
        <div 
          ref={canvasRef}
          className="w-full h-full relative focus:outline-none focus:ring-2 focus:ring-indigo-600"
          style={{ backgroundSize: '20px 20px', backgroundImage: 'radial-gradient(circle, #374151 1px, rgba(0,0,0,0) 1px)' }}
          onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}
          onClick={(e) => { if(e.target === canvasRef.current) setSelectedNodeId(null); }}
          onKeyDown={handleKeyDown} tabIndex={0}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connectionPaths}
              {connectingPath}
          </svg>
          {nodes.map(node => (
            <Node key={node.id} node={node} isSelected={node.id === selectedNodeId}
              onClick={() => setSelectedNodeId(node.id)} onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onRemove={() => requestRemoveNode(node.id)} onStartConnection={() => handleStartConnection(node.id)}
              onEndConnection={() => handleEndConnection(node.id)} socketRefs={socketRefs}
            />
          ))}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center p-4">
              <p className="text-gray-500 max-w-xs">Click "Add Node" to begin building your workflow. Drag a node's output socket to another's input to connect them.</p>
            </div>
          )}
        </div>
        
        {isAddPanelOpen && (
          <div className="absolute top-0 right-0 h-full w-96 bg-gray-800 shadow-2xl z-20 border-l border-gray-700 flex flex-col p-4 animate-fade-in">
            <AddStepModal
                onClose={() => setIsAddPanelOpen(false)}
                onAddStep={(step) => {
                    addNode({ type: step.type, name: step.name, prompt: step.prompt });
                    setIsAddPanelOpen(false);
                }}
            />
          </div>
        )}
      </div>

      {nodeToDelete && (
        <Dialog title="Confirm Deletion" onClose={handleCancelRemove}>
            <p className="py-4">
                Are you sure you want to delete this node and its connections?
            </p>
            <DialogActionsBar>
                <Button onClick={handleCancelRemove}>Cancel</Button>
                <Button onClick={handleConfirmRemove} themeColor={'primary'}>Delete</Button>
            </DialogActionsBar>
        </Dialog>
      )}
    </div>
  );
};

export default FlowEditor;
