# Gestor de Contratos - Deployment Guide

## Overview

Frontend React application for real estate contract management, built with Vite, Chakra UI, and React Router.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Environment Variables

### Development
Copy `.env.example` to `.env` and configure:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_NODE_ENV=development
VITE_ENABLE_DEBUG=false
VITE_API_TIMEOUT=30000
```

### Production
Configure these in your deployment platform (Vercel, Netlify, etc.):

```bash
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_NODE_ENV=production
VITE_ENABLE_DEBUG=false
VITE_API_TIMEOUT=30000
VITE_DISABLE_CONSOLE=true
```

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Production Build

```bash
# Standard build
npm run build

# Production build (removes console logs)
npm run build:prod

# Clean build artifacts
npm run clean

# Preview production build
npm run preview
```

## Deployment

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Configure environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

### Manual Deployment

```bash
# Build for production
npm run build:prod

# Deploy dist/ folder to your hosting service
```

## Backend Integration

### Authentication Endpoints

The frontend expects these API endpoints:

- `POST /api/auth/login/` - User login
  ```json
  Request: { "username": "string", "password": "string" }
  Response: { "access": "string", "refresh": "string", "user": object }
  ```

- `POST /api/auth/refresh/` - Refresh token
  ```json
  Request: { "refresh": "string" }
  Response: { "access": "string" }
  ```

### Contract Management Endpoints

- `GET /api/contratos/` - List contracts
- `POST /api/contratos/` - Create contract
- `GET /api/contratos/{id}/` - Get contract details
- `PUT /api/contratos/{id}/` - Update contract
- `DELETE /api/contratos/{id}/` - Delete contract
- `GET /api/contratos/{id}/meses/` - Get contract months
- `POST /api/contratos/{id}/aplicar-aumento/` - Apply increase
- `POST /api/contratos/{id}/aplicar-aumento-mora/` - Apply late fee

### Index Endpoints

- `GET /api/indices/ipc/` - Get IPC index
- `GET /api/indices/icl/` - Get ICL index
- `GET /api/indices/casa-propia/` - Get Casa Propia index

## Security Notes

- JWT tokens are stored in localStorage
- Automatic token refresh on 401 errors
- All API requests include Bearer token authentication
- Console logs are removed in production builds

## Performance Optimizations

- Code splitting with manual chunks
- Asset optimization and caching
- Lazy loading for better initial load
- Optimized bundle sizes

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Verify `VITE_API_BASE_URL` is correct
   - Check CORS configuration on backend
   - Ensure backend is running and accessible

2. **Authentication Issues**
   - Verify JWT token format
   - Check token refresh endpoint
   - Ensure proper CORS headers

3. **Build Errors**
   - Run `npm run lint` to check for syntax errors
   - Ensure all dependencies are installed
   - Check Node.js version compatibility

### Debug Mode

Enable debug mode in development:
```bash
VITE_ENABLE_DEBUG=true
```

## Support

For deployment issues or questions, contact the development team.
