#!/bin/bash
# Script to deploy GIS Agent to Google Cloud Run

# Exit on error
set -e

# Configuration
PROJECT_ID="geogemma-458120"
SERVICE_NAME="geogemma-gis-agent"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
MEMORY="1Gi"
CPU="1"
MAX_INSTANCES=10
TIMEOUT="300s"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print a step
print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

# Function to print info
print_info() {
    echo -e "${YELLOW}-->${NC} $1"
}

# Function to print error and exit
print_error() {
    echo -e "${RED}Error:${NC} $1"
    exit 1
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    print_error "docker is not installed. Please install it from https://docs.docker.com/get-docker/"
fi

# Ensure user is logged in to gcloud
print_step "Ensuring you're logged in to Google Cloud"
gcloud auth print-identity-token &> /dev/null || gcloud auth login

# Set the project ID
print_step "Setting Google Cloud project to ${PROJECT_ID}"
gcloud config set project ${PROJECT_ID}

# Configure Docker to use gcloud as a credential helper
print_step "Configuring Docker to use Google Cloud credentials"
gcloud auth configure-docker

# Build the Docker image
print_step "Building the Docker image"
docker build -t ${IMAGE_NAME} .

# Push the image to Google Container Registry
print_step "Pushing the image to Google Container Registry"
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
print_step "Deploying to Cloud Run"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --memory ${MEMORY} \
    --cpu ${CPU} \
    --max-instances ${MAX_INSTANCES} \
    --timeout ${TIMEOUT} \
    --allow-unauthenticated \
    --port 8081 \
    --set-env-vars="PORT=8081" \
    --update-secrets="/secrets/earth-engine.json=earth_engine_key:latest"

# Get the URL of the deployed service
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format="value(status.url)")

print_step "Deployment completed successfully!"
print_info "Your GIS Agent is now available at: ${SERVICE_URL}"
print_info "Health check endpoint: ${SERVICE_URL}/health"
print_info "API documentation: ${SERVICE_URL}/api/docs" 