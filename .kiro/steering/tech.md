# Technology Stack

## Build System & Framework
- **Build Tool**: Vite 6.3.5 with TypeScript support
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Package Manager**: pnpm (preferred) or npm
- **Node.js**: Version 18+ required

## Core Dependencies
- **Styling**: Tailwind CSS 3.4.17 with PostCSS
- **State Management**: Zustand 5.0.3 (lightweight state management)
- **YAML Processing**: js-yaml 4.1.0 for configuration parsing
- **Animation/Export**: 
  - html2canvas 1.4.1 for screen capture
  - gif.js 0.2.0 for GIF generation
- **Icons**: Lucide React 0.511.0
- **Routing**: React Router DOM 7.3.0
- **Utilities**: 
  - clsx 2.1.1 for conditional classes
  - tailwind-merge 3.0.2 for class merging

## Development Tools
- **Linting**: ESLint 9.25.0 with TypeScript support
- **TypeScript**: Version 5.8.3
- **Path Resolution**: vite-tsconfig-paths for @ imports

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Type checking without emit
pnpm check
```

### Build & Deploy
```bash
# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint code
pnpm lint
```

## Configuration Files
- `vite.config.ts`: Vite configuration with React plugin and path resolution
- `tsconfig.json`: TypeScript config with strict mode disabled for flexibility
- `tailwind.config.js`: Tailwind CSS configuration with dark mode support
- `eslint.config.js`: ESLint configuration for React and TypeScript

## Deployment
- **Platform**: Vercel (configured via vercel.json)
- **Type**: Static site deployment
- **Build Output**: Standard Vite build output in `dist/`