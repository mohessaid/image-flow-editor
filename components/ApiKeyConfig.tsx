import React, { useState, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { TextBox } from "@progress/kendo-react-inputs";
import { Dialog, DialogActionsBar } from "@progress/kendo-react-dialogs";
import {
  Notification,
  NotificationGroup,
} from "@progress/kendo-react-notification";
import { Fade } from "@progress/kendo-react-animation";

interface ApiKeyConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyChange: (apiKey: string) => void;
  currentApiKey: string;
}

const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({
  isOpen,
  onClose,
  onApiKeyChange,
  currentApiKey,
}) => {
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setApiKey(currentApiKey);
  }, [currentApiKey]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setNotification({ type: "error", message: "API key cannot be empty" });
      return;
    }

    if (!apiKey.startsWith("AI") || apiKey.length < 30) {
      setNotification({
        type: "error",
        message:
          'Invalid API key format. Gemini API keys typically start with "AI" and are longer than 30 characters.',
      });
      return;
    }

    onApiKeyChange(apiKey.trim());
    setNotification({
      type: "success",
      message: "API key saved successfully!",
    });
    setTimeout(() => {
      onClose();
      setNotification(null);
    }, 1500);
  };

  const handleClear = () => {
    setApiKey("");
    onApiKeyChange("");
    setNotification({
      type: "success",
      message: "API key cleared successfully!",
    });
    setTimeout(() => {
      onClose();
      setNotification(null);
    }, 1500);
  };

  const toggleVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog
        title="Configure Gemini API Key"
        onClose={onClose}
        width={500}
        height={400}
        className="bg-gray-800 text-white"
      >
        <div className="p-6 space-y-4">
          <div className="mb-4">
            <p className="text-sm text-gray-300 mb-2">
              Enter your Google Gemini API key to use the image editing
              features.
            </p>
            <p className="text-xs text-gray-400">
              Don't have an API key? Check the instructions tab for details on
              how to get one.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              API Key
            </label>
            <div className="relative">
              <TextBox
                value={apiKey}
                onChange={(e) => setApiKey(e.value as string)}
                placeholder="Enter your Gemini API key (starts with 'AI...')"
                type={showApiKey ? "text" : "password"}
                className="w-full pr-16"
                style={{
                  backgroundColor: "#374151",
                  color: "white",
                  border: "1px solid #4B5563",
                }}
              />
              <button
                type="button"
                onClick={toggleVisibility}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
              >
                {showApiKey ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L8.464 8.464m1.414 1.414l4.242 4.242"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {currentApiKey && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-md p-3">
              <p className="text-sm text-green-300">
                ✅ API key is currently configured
              </p>
            </div>
          )}

          {!currentApiKey && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-md p-3">
              <p className="text-sm text-yellow-300">
                ⚠️ No API key configured. You won't be able to process images
                without one.
              </p>
            </div>
          )}
        </div>

        <DialogActionsBar>
          <div className="flex space-x-2 justify-end">
            {currentApiKey && (
              <Button
                onClick={handleClear}
                fillMode="outline"
                themeColor="error"
                size="medium"
              >
                Clear
              </Button>
            )}
            <Button onClick={onClose} fillMode="outline" size="medium">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              themeColor="primary"
              size="medium"
              disabled={!apiKey.trim()}
            >
              Save
            </Button>
          </div>
        </DialogActionsBar>
      </Dialog>

      <NotificationGroup
        style={{
          right: "10px",
          bottom: "10px",
          alignItems: "flex-end",
          zIndex: 2000,
        }}
      >
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
    </>
  );
};

export default ApiKeyConfig;
