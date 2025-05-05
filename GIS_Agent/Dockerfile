FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Set the internal port to 8081
ENV PORT=8081
ENV INTERNAL_PORT=8081

# Create an entrypoint script for flexible port configuration
RUN echo '#!/bin/bash\n\
# Use PORT env var from Cloud Run if available, otherwise use INTERNAL_PORT\n\
export SERVER_PORT=${PORT:-$INTERNAL_PORT}\n\
# Start the server with the configured port\n\
python src/mcp_server/server.py --port $SERVER_PORT\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Expose the internal port
EXPOSE 8081