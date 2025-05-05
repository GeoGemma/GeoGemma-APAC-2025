#!/usr/bin/env python3
"""
Server script for the GIS Agent chat frontend.

This script serves the frontend files and provides instructions on how to use the chat interface.
"""

import http.server
import socketserver
import os
import webbrowser
import argparse
from pathlib import Path
import sys

# Add the parent directory to the sys.path
sys.path.insert(0, str(Path(__file__).parent))

class FrontendHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler that serves from the frontend directory."""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve files from
        self.directory = str(Path(__file__).parent / "frontend")
        super().__init__(*args, directory=self.directory, **kwargs)
    
    def log_message(self, format, *args):
        """Override to provide more concise logging."""
        if args[0] == "GET / HTTP/1.1" or args[0].startswith("GET /css/") or args[0].startswith("GET /js/"):
            print(f"Serving: {args[0]}")


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Serve the GIS Agent chat frontend')
    
    parser.add_argument(
        '--port',
        type=int,
        default=8000,
        help='Port to serve the chat frontend on (default: 8000)'
    )
    
    parser.add_argument(
        '--no-browser',
        action='store_true',
        help='Don\'t open the browser automatically'
    )
    
    return parser.parse_args()


def check_mcp_server_status():
    """Check if the MCP server appears to be running."""
    import socket
    
    try:
        # Try to connect to the MCP server port
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)  # Set a timeout of 1 second
        result = s.connect_ex(('localhost', 8080))
        s.close()
        
        # If the connection was successful (result == 0), the port is open
        return result == 0
    except:
        return False


def main():
    """Run the HTTP server."""
    args = parse_arguments()
    
    # Display banner
    print("\n" + "=" * 80)
    print("GIS Agent Chat Frontend".center(80))
    print("=" * 80 + "\n")
    
    # Check if MCP server is running
    mcp_running = check_mcp_server_status()
    if not mcp_running:
        print("⚠️  WARNING: MCP server does not appear to be running on port 8080.")
        print("   The chat interface will not function correctly without the MCP server.")
        print("   Please start the MCP server in another terminal with:")
        print("   python src/main.py\n")
    else:
        print("✅ MCP server appears to be running on port 8080.\n")
    
    # Create and start the server
    try:
        with socketserver.TCPServer(("", args.port), FrontendHandler) as httpd:
            frontend_url = f"http://localhost:{args.port}"
            print(f"✅ Serving frontend at {frontend_url}")
            print("   Press Ctrl+C to stop the server\n")
            
            # Open the browser
            if not args.no_browser:
                print("🌐 Opening browser...")
                webbrowser.open(frontend_url)
            
            # Keep the server running
            print("⏳ Server is running...\n")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"❌ Error: Port {args.port} is already in use.")
            print(f"   Try a different port: python serve_frontend.py --port {args.port + 1}")
            sys.exit(1)
        else:
            raise
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")


if __name__ == "__main__":
    main() 