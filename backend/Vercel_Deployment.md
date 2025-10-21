# Vercel Deployment Guide

## 🚀 Deploying to Vercel

Your backend is now configured for Vercel serverless deployment.

### Prerequisites
- Vercel CLI installed: `npm i -g vercel`
- Git repository connected to Vercel

### Quick Deployment

```bash
# Build the project locally first
npm run build

# Deploy to Vercel
vercel

# For production deployment
vercel --prod
```

### Environment Variables (Vercel Dashboard)

Set these in your Vercel project dashboard:

```bash
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
```

### Vercel Configuration

The `vercel.json` file is already configured:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "dist/server.js": {
      "maxDuration": 30
    }
  }
}
```

### Deployment Process

1. **Build Process**: Vercel runs `npm run vercel-build` (which runs `npm run build`)
2. **Function Creation**: Creates serverless function from `dist/server.js`
3. **Routing**: All requests routed to the serverless function
4. **Environment**: Production environment variables injected

### API Endpoints Available

All your API endpoints will be available at:
```
https://your-backend.vercel.app/api/auth/*
https://your-backend.vercel.app/api/employees/*
https://your-backend.vercel.app/api/attendance/*
https://your-backend.vercel.app/api/tasks/*
```

### Health Check
```
GET https://your-backend.vercel.app/api/health
```

### Features Optimized for Vercel

- ✅ **Serverless Functions** - Automatic scaling
- ✅ **CDN Integration** - Fast global delivery
- ✅ **Environment Variables** - Secure configuration
- ✅ **Custom Domains** - Easy setup
- ✅ **Monitoring** - Built-in analytics
- ✅ **SSL Certificate** - Automatic HTTPS

### Production Checklist

- [ ] Environment variables configured in Vercel dashboard
- [ ] Domain configured (if using custom domain)
- [ ] Frontend URL updated to match deployed backend URL
- [ ] Database connection tested
- [ ] Email service tested
- [ ] Health check endpoint verified

### Troubleshooting

**Common Issues:**

1. **Build Failures**: Check that all dependencies are installed and TypeScript compiles correctly
2. **Environment Variables**: Ensure all required variables are set in Vercel dashboard
3. **CORS Issues**: Update `FRONTEND_URL` to match your deployed frontend URL
4. **Database Connection**: Verify Supabase credentials are correct

**Logs**: Check Vercel dashboard for function logs and error details.

---

Your backend is now ready for Vercel deployment! 🎉
