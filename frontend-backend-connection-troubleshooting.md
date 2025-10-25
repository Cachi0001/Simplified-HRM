# Frontend-Backend Connection Troubleshooting Guide

## Issue Summary
The frontend is not connecting to the backend during signup, resulting in a "signup failed" toast message with no corresponding logs in the backend.

## Diagnosis Results

### Backend Status
✅ **Backend is running and accessible**
- Health endpoint (`http://localhost:3000/api/health`) returns a 200 OK response
- Signup endpoint works correctly when tested directly via API calls
- CORS is properly configured to allow requests from `http://localhost:5173`
- Backend logs show "No origin" for CORS requests, suggesting the frontend requests aren't reaching the backend

### Frontend Configuration
✅ **Frontend API configuration looks correct**
- API base URL is set to `http://localhost:3000/api` in development
- Vite proxy is configured to forward `/api` requests to `http://localhost:3000`
- Authentication service is properly implemented to handle signup requests

## Potential Issues

1. **Proxy Configuration Issue**
   - The Vite proxy might not be correctly forwarding requests to the backend
   - Frontend might be making requests to the wrong URL

2. **CORS Configuration**
   - Although CORS is configured correctly, there might be issues with how the frontend is sending the Origin header

3. **Network/Firewall Issues**
   - Local firewall or network settings might be blocking connections

4. **Browser Cache/Cookies**
   - Stale cache or cookies might be interfering with requests

## Troubleshooting Steps

### 1. Verify Frontend Network Requests
```
1. Open your browser's Developer Tools (F12 or Ctrl+Shift+I)
2. Go to the Network tab
3. Try to sign up on the frontend
4. Look for any failed requests to the backend
5. Check the request URL, headers, and response
```

### 2. Test Direct API Connection
```
1. Open a new browser tab
2. Navigate to http://localhost:3000/api/health
3. Verify you get a successful response
```

### 3. Check Frontend Console for Errors
```
1. Open your browser's Developer Tools
2. Go to the Console tab
3. Look for any error messages related to API requests
4. Pay attention to CORS errors or connection refused errors
```

### 4. Modify Frontend API Configuration for Testing
Try modifying the frontend's API configuration to use the full URL instead of relying on the proxy:

```javascript
// In frontend/src/lib/api.ts
const devApiUrl = 'http://localhost:3000/api'; // Make sure this is exactly as shown
```

### 5. Test with a Simple Fetch Request
Create a simple test in the browser console:

```javascript
fetch('http://localhost:3000/api/health', {
  headers: {
    'Origin': 'http://localhost:5173'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### 6. Check for Proxy Logs
Look for proxy logs in the Vite development server console:
- "Sending Request to the Target" messages
- "Received Response from the Target" messages

### 7. Restart Both Servers
```
1. Stop both the frontend and backend servers
2. Start the backend server first: cd backend && npm run dev
3. Start the frontend server: cd frontend && npm run dev
4. Try the signup process again
```

### 8. Clear Browser Cache and Cookies
```
1. Open browser settings
2. Clear browsing data
3. Select cookies and cache
4. Clear data
5. Restart the browser and try again
```

## Advanced Troubleshooting

### Check MongoDB Connection
The MongoDB connection string in the `.env` file might have special characters that need to be escaped:
```
MONGODB_URI=mongodb+srv://onyemechicaleb4_db_user:jzgZeTkO7wto74h3@go3net-hrm.ayzjeu7.mongodb.net/?appName=go3net-HRM
```

### Modify CORS Configuration for Testing
Temporarily modify the CORS configuration in the backend to allow all origins:

```javascript
// In backend/src/server.ts
const corsOptions = {
  origin: '*', // Allow all origins for testing
  credentials: true,
  optionsSuccessStatus: 200
};
```

### Test with a Different Browser
Try using a different browser to rule out browser-specific issues.

## Conclusion
The backend API is functioning correctly when tested directly, but the frontend requests aren't reaching the backend. This suggests an issue with how the frontend is making requests or how the proxy is configured. Follow the troubleshooting steps above to identify and resolve the connection issue.