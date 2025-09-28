import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@progress/kendo-react-buttons';
import type { ImageFile } from '../types';
import classnames from 'classnames';

interface FileUploaderProps {
  onFilesChange: (files: ImageFile[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesChange }) => {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFilesUpdate = useCallback((newFiles: ImageFile[]) => {
    setImageFiles(newFiles);
    onFilesChange(newFiles);
  }, [onFilesChange]);

  const processFiles = useCallback((files: FileList) => {
    const newRawFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (newRawFiles.length === 0) return;

    const filePromises = newRawFiles.map(file => {
      return new Promise<ImageFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({
          id: `${file.name}-${file.lastModified}`, // More stable ID
          file: file,
          dataUrl: e.target?.result as string,
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then(newImages => {
      setImageFiles(currentImages => {
        const existingIds = new Set(currentImages.map(f => f.id));
        const uniqueNewImages = newImages.filter(f => !existingIds.has(f.id));
        const updatedFiles = [...currentImages, ...uniqueNewImages];
        onFilesChange(updatedFiles);
        return updatedFiles;
      });
    });
  }, [onFilesChange]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(event.target.files);
    }
    if (inputRef.current) {
      inputRef.current.value = ""; // Allow re-selecting the same file
    }
  };

  const handleRemove = (fileId: string) => {
    handleFilesUpdate(imageFiles.filter(f => f.id !== fileId));
  };

  const handleClear = () => handleFilesUpdate([]);
  const triggerFileInput = () => inputRef.current?.click();

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isOver: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(isOver);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    processFiles(e.dataTransfer.files);
  };

  const dropZoneClasses = classnames(
    "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ease-in-out text-gray-400", {
      "bg-indigo-500/20 border-indigo-400 scale-105": isDraggingOver,
      "bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 hover:border-gray-500": !isDraggingOver,
    }
  );

  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-lg h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4 text-gray-200 border-b border-gray-600 pb-2 flex-shrink-0">
        1. Upload Images
      </h2>
      
      <div className="space-y-4 flex-grow flex flex-col">
        <input
          type="file" multiple accept="image/*" ref={inputRef} onChange={handleFileChange} className="hidden" aria-hidden="true"
        />
        <div 
          className={dropZoneClasses} onClick={triggerFileInput} onDragEnter={e => handleDragEvents(e, true)}
          onDragLeave={e => handleDragEvents(e, false)} onDragOver={e => handleDragEvents(e, true)} onDrop={handleDrop}
          role="button" tabIndex={0} aria-label="Image upload drop zone"
        >
           <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
           <p className="mb-2 text-sm"><span className="font-semibold">Click to upload</span> or drag and drop</p>
           <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP</p>
        </div>

         {imageFiles.length > 0 && (
          <>
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">{imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} selected</p>
                <Button onClick={handleClear} size="small">Clear All</Button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 rounded-md">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {imageFiles.map(imageFile => (
                    <div key={imageFile.id} className="relative group aspect-square rounded-md overflow-hidden animate-fade-in">
                      <img src={imageFile.dataUrl} alt={imageFile.file.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                              icon="close"
                              fillMode="flat"
                              themeColor="light"
                              onClick={(e) => { e.stopPropagation(); handleRemove(imageFile.id); }}
                              title={`Remove ${imageFile.file.name}`}
                              className="!w-8 !h-8 rounded-full hover:bg-white/10"
                          />
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </>
         )}
      </div>
    </div>
  );
};

export default FileUploader;