import React from "react";
import { Button } from "@progress/kendo-react-buttons";

interface ApiKeyInstructionsProps {
  onOpenApiKeyConfig: () => void;
}

const ApiKeyInstructions: React.FC<ApiKeyInstructionsProps> = ({
  onOpenApiKeyConfig,
}) => {
  return (
    <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          🔑 How to Get Your Gemini API Key
        </h2>
        <p className="text-gray-300 text-lg">
          Follow these steps to obtain your Google Gemini API key and start
          using AI-powered image editing
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <div className="border-l-4 border-blue-500 pl-6 py-4">
          <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
            <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold">
              1
            </span>
            Visit Google AI Studio
          </h3>
          <div className="text-gray-300 space-y-3">
            <p>Go to Google AI Studio to create your API key:</p>
            <div className="bg-gray-900 rounded-lg p-4">
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-mono text-sm"
              >
                https://aistudio.google.com/
              </a>
            </div>
            <p className="text-sm text-gray-400">
              You'll need a Google account to access AI Studio.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="border-l-4 border-green-500 pl-6 py-4">
          <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
            <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold">
              2
            </span>
            Sign In and Navigate to API Keys
          </h3>
          <div className="text-gray-300 space-y-3">
            <p>Once you're signed in to Google AI Studio:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                Look for the "Get API key" button in the sidebar or main
                interface
              </li>
              <li>Click on it to access the API key management page</li>
              <li>Alternatively, you can directly visit the API key page</li>
            </ul>
            <div className="bg-gray-900 rounded-lg p-4">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-mono text-sm"
              >
                https://aistudio.google.com/app/apikey
              </a>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="border-l-4 border-purple-500 pl-6 py-4">
          <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
            <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold">
              3
            </span>
            Create Your API Key
          </h3>
          <div className="text-gray-300 space-y-3">
            <p>On the API key page:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Click the "Create API key" button</li>
              <li>
                Choose "Create API key in new project" (recommended for
                first-time users)
              </li>
              <li>
                Or select an existing Google Cloud project if you have one
              </li>
              <li>Your API key will be generated instantly</li>
            </ul>
          </div>
        </div>

        {/* Step 4 */}
        <div className="border-l-4 border-yellow-500 pl-6 py-4">
          <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
            <span className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold">
              4
            </span>
            Copy and Secure Your API Key
          </h3>
          <div className="text-gray-300 space-y-3">
            <p>Important security steps:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Copy the generated API key (it starts with "AI...")</li>
              <li>Store it securely - don't share it publicly</li>
              <li>The key provides access to your Google AI services</li>
            </ul>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
              <p className="text-yellow-300 text-sm flex items-start">
                <svg
                  className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  <strong>Security Warning:</strong> Never commit your API key
                  to version control or share it in public repositories. This
                  application stores your key locally in your browser.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="border-l-4 border-red-500 pl-6 py-4">
          <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
            <span className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold">
              5
            </span>
            Configure in Image Flow Editor
          </h3>
          <div className="text-gray-300 space-y-3">
            <p>Now you're ready to use your API key:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Click the "Configure API Key" button below</li>
              <li>Paste your API key in the configuration dialog</li>
              <li>Save the key to start using AI image editing features</li>
            </ul>
            <div className="mt-4">
              <Button
                onClick={onOpenApiKeyConfig}
                themeColor="primary"
                size="large"
                className="px-6"
              >
                Configure API Key
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-gray-900 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            📋 Additional Information
          </h3>
          <div className="space-y-4 text-gray-300 text-sm">
            <div>
              <h4 className="font-medium text-white mb-2">Pricing & Usage:</h4>
              <p>
                Google provides free tier usage for Gemini API. Check the
                current pricing and limits at Google AI Studio.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Supported Models:</h4>
              <p>
                This application uses the Gemini 2.5 Flash Image Preview model
                for image editing capabilities.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Data Privacy:</h4>
              <p>
                Your API key is stored locally in your browser and never
                transmitted to any servers except Google's API endpoints.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Troubleshooting:</h4>
              <p>
                If you encounter issues, verify your API key is correct and that
                you have sufficient quota in your Google Cloud project.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInstructions;
