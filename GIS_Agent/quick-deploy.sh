#!/bin/bash
# Quick deployment script for GIS Agent to Google Cloud Run

# Exit on error
set -e

# Configuration
PROJECT_ID="geogemma-458120"
SERVICE_NAME="geogemma-gis-agent"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Build and push the Docker image
echo "Building and pushing Docker image..."
docker build -t ${IMAGE_NAME} .
docker push ${IMAGE_NAME}

# Update the Cloud Run service
echo "Updating Cloud Run service..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --quiet

# Output the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format="value(status.url)")
echo "Deployment completed successfully!"
echo "Your GIS Agent is now available at: ${SERVICE_URL}" 