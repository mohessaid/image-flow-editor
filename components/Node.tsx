import React from 'react';
import { Button } from '@progress/kendo-react-buttons';
import type { WorkflowNode } from '../types';
import classnames from 'classnames';

interface NodeProps {
    node: WorkflowNode;
    isSelected: boolean;
    onClick: () => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onRemove: () => void;
    onStartConnection: () => void;
    onEndConnection: () => void;
    socketRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
}

const Node: React.FC<NodeProps> = ({
    node, isSelected, onClick, onMouseDown, onRemove, onStartConnection, onEndConnection, socketRefs
}) => {
    
    const handleSocketMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartConnection();
    };

    const handleInputMouseUp = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEndConnection();
    };

    const nodeClasses = classnames(
        "absolute p-3 bg-gray-700 rounded-lg shadow-xl w-64 select-none animate-fade-in transition-all duration-150 border-2", {
            'ring-4 ring-indigo-500/50 border-indigo-500': isSelected,
            'border-gray-600 hover:border-gray-500': !isSelected
        }
    );

    return (
        <div className={nodeClasses} style={{ left: node.position.x, top: node.position.y }} onClick={onClick} >
             <div className="flex items-start justify-between pb-2 border-b border-gray-600 cursor-move" onMouseDown={onMouseDown}>
                <div className="flex-1 mr-2">
                    <h3 className="font-bold text-indigo-400 pointer-events-none text-base leading-tight">{node.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 break-words">{node.prompt}</p>
                </div>
                 <Button
                    icon="close" fillMode="flat" size="small"
                    onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove node"
                    className="!w-6 !h-6 rounded-full flex-shrink-0"
                />
             </div>

            {/* Sockets */}
            <div
                ref={el => { socketRefs.current.set(`${node.id}-input`, el); }} 
                className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-500 rounded-full border-2 border-gray-700 hover:bg-green-500 hover:scale-110 transition-all cursor-crosshair"
                title="Input"
                onMouseUp={handleInputMouseUp}
            />
            <div
                ref={el => { socketRefs.current.set(`${node.id}-output`, el); }} 
                className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-500 rounded-full border-2 border-gray-700 hover:bg-blue-500 hover:scale-110 transition-all cursor-crosshair"
                title="Output"
                onMouseDown={handleSocketMouseDown}
            />
        </div>
    );
};

export default Node;
