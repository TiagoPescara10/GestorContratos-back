# Project Setup Guide for AI Development

## Quick Start
```bash
npm install
npm run dev
```

## Environment Configuration
- Copy `.env.example` to `.env` (if exists)
- Configure API endpoints in `src/api/client.js`
- Set up authentication tokens if needed

## Development Workflow
1. **Start Development Server**: `npm run dev`
2. **Lint Code**: `npm run lint`
3. **Build for Production**: `npm run build`
4. **Preview Build**: `npm run preview`

## Key Files to Understand
- `src/main.jsx` - Application entry point with Chakra setup
- `src/routes/AppRouter.jsx` - Main routing configuration
- `src/api/` - API integration layer
- `src/components/` - Reusable UI components
- `src/pages/` - Page-level components
- `src/utils/` - Utility functions

## Component Hierarchy
```
App
  AppRouter
    Login (public)
    ProtectedRoute
      Dashboard
      Contratos
      CargarContrato
      EditarContrato
      DetalleContrato
```

## Data Flow
1. API calls made from `src/api/`
2. Data flows to components via props
3. State managed with React hooks
4. Updates trigger re-renders
5. Changes synchronized with API

## Styling Approach
- Chakra UI components for base styling
- Responsive props for mobile-first design
- Custom styles only when necessary
- Consistent spacing and color usage

## Common Patterns
- Functional components with hooks
- Async/await for API calls
- Error boundaries for error handling
- Loading states during async operations
- Form validation and error display

## Testing Strategy
- Component testing with React Testing Library
- API mocking for isolated testing
- User flow testing for critical paths
- Error scenario testing

## Deployment Considerations
- Build optimization with Vite
- Environment variable management
- API endpoint configuration
- Asset optimization
- Security hardening
