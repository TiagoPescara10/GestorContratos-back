# Development Rules for Gestor de Contratos

## Architecture Rules
- Use functional components with React hooks only
- Implement proper error boundaries for all async operations
- Maintain separation of concerns between UI and business logic
- Use Chakra UI components consistently throughout the application
- Implement responsive design using Chakra's responsive props

## Code Quality Standards
- Components should not exceed 200 lines of code
- Use descriptive variable and function names in Spanish or English consistently
- Implement proper TypeScript types (if added later)
- Add meaningful comments for complex business logic
- Follow React best practices and patterns

## UI/UX Requirements
- All forms must have proper validation and error states
- Implement loading states for all async operations
- Use consistent color scheme from Chakra theme
- Ensure mobile responsiveness for all components
- Implement proper accessibility attributes

## Performance Guidelines
- Use React.memo for expensive components
- Implement proper dependency arrays in useEffect
- Avoid unnecessary re-renders
- Use code splitting for large components
- Optimize bundle size

## API Integration Rules
- Handle all API errors gracefully
- Implement proper loading states
- Use try-catch blocks for async operations
- Implement retry logic for failed requests
- Sanitize all user inputs

## File Structure Rules
- Keep related files together
- Use index files for cleaner imports
- Maintain consistent naming conventions
- Separate utilities from components
- Use proper folder organization

## Security Requirements
- Validate all user inputs
- Implement proper authentication checks
- Use secure API practices
- Sanitize data before rendering
- Implement CSRF protection

## Testing Requirements
- Test all utility functions
- Test critical user flows
- Mock API calls in tests
- Test error scenarios
- Maintain good test coverage
