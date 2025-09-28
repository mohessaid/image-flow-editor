import React, { useState } from "react";
import { Button } from "@progress/kendo-react-buttons";
import type { OutputImage } from "../types";

interface OutputViewerProps {
  outputs: OutputImage[];
  isLoading: boolean;
}

const OutputViewer: React.FC<OutputViewerProps> = ({ outputs, isLoading }) => {
  const [previewImage, setPreviewImage] = useState<OutputImage | null>(null);

  const downloadImage = (dataUrl: string, filename: string) => {
    const safeFilename = filename.replace(/[^a-z0-9_.-]/gi, "_");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `edited-${safeFilename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    outputs.forEach((output, index) => {
      setTimeout(
        () => downloadImage(output.dataUrl, output.originalFileName),
        index * 300,
      );
    });
  };

  const EmptyState = () => (
    <div className="flex items-center justify-center h-full text-center">
      <div>
        <svg
          className="w-16 h-16 mx-auto text-gray-600 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          ></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-300">No results yet</h3>
        <p className="text-gray-500 mt-1">
          {isLoading
            ? "Processing images..."
            : "Execute a workflow to see results here."}
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-lg min-h-[400px] h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-gray-600 pb-2 mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-200">
          3. Output{" "}
          {outputs.length > 0 && (
            <span className="text-gray-400 font-normal">
              ({outputs.length} generated)
            </span>
          )}
        </h2>
        {outputs.length > 1 && (
          <Button
            themeColor="primary"
            onClick={downloadAll}
            className="flex items-center"
          >
            <span className="mr-2 text-lg leading-none">⬇</span>
            Download All
          </Button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto relative">
        {outputs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 p-1 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
            {outputs.map((output, index) => (
              <div
                key={output.id}
                className="group relative border-2 border-transparent hover:border-indigo-500 focus-within:border-indigo-500 focus:outline-none rounded-lg overflow-hidden aspect-square cursor-pointer bg-gray-900/50 animate-fade-in-up"
                onClick={() => setPreviewImage(output)}
                role="button"
                tabIndex={0}
                aria-label={`Preview ${output.originalFileName}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setPreviewImage(output);
                }}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <img
                  src={output.dataUrl}
                  alt={`Edited version of ${output.originalFileName}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center p-4">
                  <p className="text-white text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-bold">
                    Click to Preview
                  </p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p
                    className="text-white text-xs truncate"
                    title={output.originalFileName}
                  >
                    {output.originalFileName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 bg-gray-900/90 z-50 flex flex-col p-4 sm:p-8 animate-fade-in backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="w-full max-w-6xl mx-auto flex flex-col h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3
                className="text-lg font-medium text-gray-200 truncate pr-4"
                title={previewImage.originalFileName}
              >
                Preview: {previewImage.originalFileName}
              </h3>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Button
                  themeColor="primary"
                  onClick={() =>
                    downloadImage(
                      previewImage.dataUrl,
                      previewImage.originalFileName,
                    )
                  }
                  className="flex items-center"
                >
                  <span className="mr-2 text-lg leading-none">⬇</span>
                  Download
                </Button>
                <Button
                  fillMode="flat"
                  themeColor="light"
                  onClick={() => setPreviewImage(null)}
                  title="Close preview"
                  className="!text-gray-200 hover:!text-white flex items-center justify-center"
                  aria-label="Close preview"
                >
                  <span className="text-lg leading-none">✕</span>
                </Button>
              </div>
            </div>
            <div className="flex-grow flex items-center justify-center min-h-0 bg-black/30 rounded-lg p-2">
              <img
                src={previewImage.dataUrl}
                alt={`Preview of ${previewImage.originalFileName}`}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutputViewer;
