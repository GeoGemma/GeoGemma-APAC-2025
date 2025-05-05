#!/bin/bash
# Simple script to update the Cloud Run service with the latest code

# Set variables
PROJECT_ID="geogemma-458120"
SERVICE_NAME="geogemma-backend"
REGION="us-central1"
SA_EMAIL="earthengine-sa@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE_TAG="v$(date +%s)"  # Unique tag based on timestamp

echo "==================================================="
echo "  Quick Deploy to Cloud Run"
echo "  Project: ${PROJECT_ID}"
echo "  Service: ${SERVICE_NAME}"
echo "==================================================="

# Set project
gcloud config set project ${PROJECT_ID}

# Build and push container
IMAGE_URL="us-central1-docker.pkg.dev/${PROJECT_ID}/backend-repo/backend:${IMAGE_TAG}"
echo "Building and pushing to ${IMAGE_URL}..."
gcloud builds submit --tag "${IMAGE_URL}"

# Update the service with the new image
echo "Updating Cloud Run service..."
gcloud run services update ${SERVICE_NAME} \
  --image="${IMAGE_URL}" \
  --region=${REGION}

# Print complete message
echo "==================================================="
echo "✅ Update complete!"
echo "🔗 View your service: $(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')"
echo "===================================================" 