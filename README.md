# Research Assistant Chrome Extension

A Chrome extension that helps with reading and understanding research papers by providing AI-generated explanations of selected text.

## Features

- Select any text in a research paper and get an AI-generated explanation
- Sidebar with previous explanations history
- Resizable and draggable sidebar interface
- Citations support when available

## Installation

### Development Setup

1. Clone this repository:
```
git clone https://github.com/yourusername/chrome-researcher.git
cd chrome-researcher
```

2. Install dependencies:
```
npm install
```

3. Start the backend server:
```
npm run start
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the project directory

## Usage

1. Navigate to any research paper or article
2. Select text you want explained
3. Click the "Explain" button that appears
4. View the explanation in the sidebar
5. Previous explanations are saved in the history section

## Technologies

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- AI: OpenAI API

## License

[MIT](LICENSE) 