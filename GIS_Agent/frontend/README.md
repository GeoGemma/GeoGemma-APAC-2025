# GIS Agent Chat Frontend

A modern, responsive web interface for interacting with the GIS Agent.

## Features

- Real-time interaction with the GIS Agent through WebSocket
- Clean, intuitive user interface
- Support for code blocks and formatted responses
- Typing indicators and connection status
- Example query suggestions
- Mobile-friendly responsive design

## Getting Started

### Prerequisites

- The GIS Agent MCP server must be running on port 8080
- Python 3.6+ with `http.server` module

### Running the Frontend

To start the frontend server, run:

```bash
python serve_frontend.py
```

This will:
1. Start a simple HTTP server on port 8000
2. Open your default web browser to the frontend interface
3. Check if the MCP server is running and provide warnings if needed

#### Command Line Options

- `--port PORT`: Specify a different port (default: 8000)
  ```bash
  python serve_frontend.py --port 8888
  ```

- `--no-browser`: Don't open the browser automatically
  ```bash
  python serve_frontend.py --no-browser
  ```

### Usage

1. Ensure the MCP server is running (`python src/main.py`)
2. Start the frontend server (`python serve_frontend.py`)
3. Wait for the "Connected" status indicator to turn green
4. Type your query in the input box and press Enter or click Send
5. Alternatively, click on one of the example queries

## Example Queries

- "What's the current weather in Tokyo?"
- "Show air quality in Los Angeles"
- "Analyze water resources in California"
- "Create a map of deforestation in Amazon"
- "Calculate carbon footprint of New York City"
- "What's the biodiversity in Costa Rica?"

## Troubleshooting

- **Connection Status Shows "Disconnected"**: Make sure the MCP server is running on port 8080
- **No Response**: Check the console for any WebSocket errors
- **Server Port Already in Use**: Use the `--port` option to specify a different port

## Development

The frontend consists of:

- `index.html`: Main HTML structure
- `css/style.css`: Styling and animations
- `js/chat.js`: WebSocket communication and UI interactions

To modify the frontend:

1. Edit the corresponding files in the `frontend` directory
2. Refresh your browser to see the changes

## License

This project is licensed under the MIT License - see the LICENSE file for details. 