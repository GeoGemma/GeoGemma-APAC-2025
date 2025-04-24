FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy the Google service account key for Earth Engine authentication
COPY geogemma-f32a4-firebase-adminsdk-fbsvc-204a010d07.json /app/service-account.json

# Create directories if they don't exist
RUN mkdir -p static templates

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Set the environment variable for Google authentication
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json

# Command to run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]