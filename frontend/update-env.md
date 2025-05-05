# Update Frontend Environment Variables

To fix the "Failed to fetch" errors, you need to update your frontend environment variables to point to your deployed Cloud Run backend URL instead of localhost.

## Steps to Update:

1. Edit the `.env` or `.env.production` file in your frontend directory:

```bash
# /Users/khalil/Documents/Github/GeoGemma/frontend/.env.production
VITE_API_URL=https://geogemma-backend-312711753493.us-central1.run.app
VITE_BACKEND_URL=https://geogemma-backend-312711753493.us-central1.run.app
```

2. If you're deploying to Firebase or another hosting service, rebuild your frontend with:

```bash
cd /Users/khalil/Documents/Github/GeoGemma/frontend
npm run build
```

3. Deploy the updated build to your hosting provider.

## Verifying the Fix:

After updating the environment variables and rebuilding/redeploying, you can verify that your frontend is correctly using the deployed backend URL:

1. Open your browser's developer tools (F12 or Cmd+Option+I)
2. Go to the Network tab
3. Perform an action that triggers an API call
4. You should now see requests going to `https://geogemma-backend-312711753493.us-central1.run.app` instead of `http://localhost:8000`

This will ensure your frontend communicates with your deployed backend instead of trying to reach a non-existent localhost server. 