
export interface ImageFile {
  id: string;
  file: File;
  dataUrl: string;
}

export enum StepType {
  PREBUILT = 'PREBUILT',
  CUSTOM = 'CUSTOM'
}

export interface WorkflowNode {
  id: string;
  type: StepType;
  prompt: string;
  name: string;
  position: { x: number; y: number };
}

export interface Connection {
    id: string;
    fromNodeId: string;
    toNodeId: string;
}

export interface OutputImage {
  id: string;
  originalImageId: string;
  originalFileName: string;
  dataUrl: string;
}

export interface OperationLog {
  id: string;
  timestamp: number; // Date.now()
  imageName: string;
  nodeName: string;
  status: 'success' | 'failure';
  cost: number; // Simulated cost
  credits: number; // Simulated credits
}
