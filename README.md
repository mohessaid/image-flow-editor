# Image Flow Generator

This is a simple image flow generator. It's started as a submission for  the Kendo UI React Challenge at Dev.to . Most of the code was generated with Google AI Studio with the help of the Kendo UI React Coding Assistant MCP.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

3. Configure your Gemini API Key:
   - Open the app in your browser
   - Click on the "Instructions" tab for detailed steps on how to get your API key
   - Use the "Configure API Key" button to enter your key
   - Your API key will be stored locally in your browser

## Getting Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Navigate to the API key section or visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
4. Click "Create API key" and select your project
5. Copy the generated API key (starts with "AI...")
6. Enter it in the application's settings

**Note:** Your API key is stored locally in your browser and never transmitted to any servers except Google's API endpoints.

# Features

- [x] Upload image(s).
- [x] Flow editor with visual node connections.
- [x] Preview results.
- [x] Download results.
- [x] Download all files at once.
- [x] Dashboard for AI tokens usage.
- [x] Dashboard stats for most used flow nodes.
- [x] User-configurable API key management.
- [x] Built-in instructions for API key generation.
- [x] Secure local storage of API credentials.
- [ ] Integrate Multiple AI Models.
- [ ] Enhance Workflow editor.
  - [x] Delete node.
  - [ ] Zoom in/out.
  - [ ] Panning.
- [ ] Add Authentication.

## Security & Privacy

- API keys are stored locally in your browser using localStorage
- No API keys are transmitted to any servers except Google's official Gemini API
- All image processing happens through Google's Gemini API directly from your browser
- No user data is stored on external servers
