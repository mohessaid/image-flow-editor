import React, { useState } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { TextArea } from "@progress/kendo-react-inputs";
import { Label } from "@progress/kendo-react-labels";
import { PREBUILT_PROMPTS } from "../constants";
import { StepType } from "../types";
import type { WorkflowNode } from "../types";

interface AddNodePanelProps {
  onClose: () => void;
  onAddStep: (step: Omit<WorkflowNode, 'id' | 'position'>) => void;
}

const stepTypeData = [
    { text: 'Pre-built Prompt', value: StepType.PREBUILT },
    { text: 'Custom Prompt', value: StepType.CUSTOM }
];

const AddStepModal: React.FC<AddNodePanelProps> = ({ onClose, onAddStep }) => {
  const [stepType, setStepType] = useState<StepType>(StepType.PREBUILT);
  const [selectedPrebuilt, setSelectedPrebuilt] = useState(PREBUILT_PROMPTS[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  
  const stepTypeID = React.useId();
  const prebuiltPromptID = React.useId();
  const customPromptID = React.useId();

  const handleAdd = () => {
    let newStep: Omit<WorkflowNode, 'id' | 'position'> | null = null;
    if (stepType === StepType.PREBUILT && selectedPrebuilt) {
      newStep = { type: StepType.PREBUILT, name: selectedPrebuilt.name, prompt: selectedPrebuilt.prompt };
    } else if (stepType === StepType.CUSTOM && customPrompt.trim()) {
      const trimmed = customPrompt.trim();
      const name = `Custom: ${trimmed.substring(0, 20)}${trimmed.length > 20 ? "..." : ""}`;
      newStep = { type: StepType.CUSTOM, name: name, prompt: trimmed };
    }
    if (newStep) onAddStep(newStep);
  };

  const isAddDisabled = (stepType === StepType.PREBUILT && !selectedPrebuilt) || (stepType === StepType.CUSTOM && !customPrompt.trim());

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-600 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-100">Add New Node</h3>
        <Button icon="close" fillMode="flat" themeColor="light" onClick={onClose} title="Close panel" />
      </div>

      <div className="flex-grow space-y-6 overflow-y-auto pr-2 -mr-2">
          <div>
            <Label editorId={stepTypeID} className="block text-sm font-medium text-gray-300 mb-2">Node Type</Label>
            <DropDownList
                id={stepTypeID} data={stepTypeData} textField="text" dataItemKey="value"
                value={stepTypeData.find(item => item.value === stepType)}
                onChange={(e) => setStepType(e.target.value.value)} className="w-full"
            />
          </div>

          {stepType === StepType.PREBUILT ? (
            <div className="animate-fade-in">
              <Label editorId={prebuiltPromptID} className="block text-sm font-medium text-gray-300 mb-2">Select a Pre-built Prompt</Label>
              <DropDownList
                id={prebuiltPromptID} data={PREBUILT_PROMPTS} textField="name" dataItemKey="prompt"
                value={selectedPrebuilt} onChange={(e) => setSelectedPrebuilt(e.target.value)} className="w-full"
              />
            </div>
          ) : (
            <div className="animate-fade-in">
              <Label editorId={customPromptID} className="block text-sm font-medium text-gray-300 mb-2">Enter Your Custom Prompt</Label>
              <TextArea
                id={customPromptID} value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value as string)}
                placeholder="e.g., make the sky look like a van gogh painting" rows={5} className="w-full"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700 flex-shrink-0">
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={isAddDisabled} themeColor={'primary'}>Add Node</Button>
        </div>
    </div>
  );
};

export default AddStepModal;
