# Fixing Earth Engine Permission Issues

If you're getting the following error when running the GeoGemma backend:

```
Caller does not have required permission to use project geogemma-458120. Grant the caller the roles/serviceusage.serviceUsageConsumer role, or a custom role with the serviceusage.services.use permission
```

Follow these steps to resolve the issue:

## 1. Verify Your Project ID

Ensure you're using the correct project ID:

```bash
gcloud config get-value project
```

If it's not `geogemma-458120`, set it:

```bash
gcloud config set project geogemma-458120
```

## 2. Grant Required Permissions to the Service Account

If you already have a service account, grant it the necessary permissions:

```bash
# Identify the service account email (adjust if needed)
SA_EMAIL="ee-service-account@geogemma-458120.iam.gserviceaccount.com"

# Grant Earth Engine user role
gcloud projects add-iam-policy-binding geogemma-458120 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/earthengine.user"

# Grant Service Usage Consumer role (fixes the permission error)
gcloud projects add-iam-policy-binding geogemma-458120 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

## 3. Create a New Service Account Key

If needed, create a new service account key:

```bash
gcloud iam service-accounts keys create ee-service-account.json \
  --iam-account=${SA_EMAIL}
```

## 4. Rebuild and Redeploy the Docker Image

1. Ensure the service account key is in the correct location:

```bash
# Copy to the backend directory if needed
cp ee-service-account.json /path/to/GeoGemma/backend/
```

2. Rebuild the Docker image:

```bash
cd /path/to/GeoGemma/backend
docker build -t gcr.io/geogemma-458120/geogemma-backend:latest .
```

3. Push and redeploy:

```bash
docker push gcr.io/geogemma-458120/geogemma-backend:latest

gcloud run deploy geogemma-backend \
  --image=gcr.io/geogemma-458120/geogemma-backend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=1 \
  --set-env-vars=EE_PROJECT_ID=geogemma-458120,SECRET_KEY=your-production-secret-key
```

## 5. Testing the Fix

To test if the permissions are working correctly, run:

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe geogemma-backend --region=us-central1 --format='value(status.url)')

# Test the health endpoint
curl $SERVICE_URL/api/health
```

If successful, the response should include `"status": "healthy"` and `"ee_initialized": true`.

## 6. Additional Troubleshooting

If you're still encountering issues:

1. Verify the Earth Engine API is enabled:
   ```bash
   gcloud services enable earthengine.googleapis.com
   ```

2. Check that the service account has the correct roles:
   ```bash
   gcloud projects get-iam-policy geogemma-458120 \
     --flatten="bindings[].members" \
     --format='table(bindings.role)' \
     --filter="bindings.members:${SA_EMAIL}"
   ```

3. Review Cloud Run logs for detailed error messages:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=geogemma-backend" --limit=20
   ``` 