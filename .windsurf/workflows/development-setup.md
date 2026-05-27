---
description: Complete development environment setup for the Gestor de Contratos project
---

# Development Setup Workflow

This workflow sets up the complete development environment for AI-assisted development of the Gestor de Contratos project.

## Prerequisites
- Node.js 18+ installed
- Git configured
- Code editor (VSCode recommended)

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
- Copy `.env.example` to `.env` if it exists
- Configure API endpoints in `src/api/client.js`
- Set up any required authentication tokens

### 3. Start Development Server
```bash
npm run dev
```

### 4. Verify Setup
- Open http://localhost:5173
- Verify all pages load correctly
- Test navigation between pages
- Check API connectivity

### 5. Code Quality Check
```bash
npm run lint
```

## AI Development Context
The project is now configured with:
- `.ai-context.md` - Complete project overview
- `.ai-instructions.md` - Development guidelines
- `.windsurf/rules.md` - Coding standards
- `PROJECT_SETUP.md` - Setup and development guide

## Recommended AI Tools Integration
- Configure your AI assistant to read the context files
- Set up code completion with React/Chakra UI snippets
- Enable AI-powered linting and error detection
- Configure AI chat to understand project structure

## Development Workflow
1. Always read the relevant context files before making changes
2. Follow the established patterns and conventions
3. Test changes thoroughly
4. Update documentation when needed
5. Use the todo list system to track progress

## Common Development Tasks
- Adding new components: Use Chakra UI patterns
- API integration: Follow existing patterns in `src/api/`
- Styling: Use Chakra props and responsive design
- Testing: Test components and user flows
- Performance: Optimize bundle and rendering

## Troubleshooting
- Check console for errors
- Verify API endpoints are accessible
- Ensure all dependencies are installed
- Check network tab for failed requests
- Review browser console for warnings
