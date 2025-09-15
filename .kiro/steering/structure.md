# Project Structure & Organization

## Root Directory Layout
```
├── src/                    # Source code
├── public/                 # Static assets and examples
├── .kiro/                  # Kiro IDE configuration
├── .trae/                  # Project documentation
├── node_modules/           # Dependencies
└── [config files]         # Build and tool configurations
```

## Source Code Organization (`src/`)

### Component Architecture
```
src/
├── components/             # React components (UI building blocks)
│   ├── ChatInterface.tsx       # Main chat display component
│   ├── ConfigPanel.tsx         # YAML configuration editor
│   ├── MessageBubble.tsx       # Individual message display
│   ├── PlaybackControls.tsx    # Animation control interface
│   ├── TypingIndicator.tsx     # Typing animation component
│   ├── LocationMessage.tsx     # Location sharing component
│   ├── VoiceMessage.tsx        # Voice message component
│   ├── ImageMessage.tsx        # Image message component
│   ├── WeChatNavBar.tsx        # WeChat-style navigation
│   └── iPhoneFrame.tsx         # iPhone frame wrapper
├── hooks/                  # Custom React hooks
│   ├── useAnimationControl.ts  # Animation state management
│   ├── useGifExport.ts         # GIF export functionality
│   └── useTheme.ts             # Theme management
├── lib/                    # Utility libraries
│   ├── yamlParser.ts           # YAML configuration parsing
│   └── utils.ts                # General utilities
├── pages/                  # Page-level components
│   └── Home.tsx                # Main application page
├── assets/                 # Static assets (images, icons)
└── [root files]           # App.tsx, main.tsx, index.css
```

## Public Assets (`public/`)
```
public/
├── examples/               # Sample YAML configurations
│   ├── apology.yaml           # Apology conversation example
│   ├── breakup.yaml           # Breakup conversation example
│   ├── confession.yaml        # Love confession example
│   └── [other examples]
├── favicon.png             # Application favicon
├── heart-icon.png          # UI icon assets
├── input.png               # WeChat input bar image
└── sample.yaml             # Default configuration
```

## Naming Conventions

### Files & Directories
- **Components**: PascalCase (e.g., `MessageBubble.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAnimationControl.ts`)
- **Utilities**: camelCase (e.g., `yamlParser.ts`)
- **Assets**: kebab-case (e.g., `heart-icon.png`)
- **Examples**: kebab-case (e.g., `daily-care.yaml`)

### Code Conventions
- **Interfaces**: PascalCase with descriptive names (e.g., `ChatData`, `Message`)
- **Props**: Component name + "Props" suffix (e.g., `ChatInterfaceProps`)
- **Functions**: camelCase with descriptive verbs (e.g., `parseYamlConfig`)
- **Constants**: UPPER_SNAKE_CASE for global constants

## Import Patterns
- Use `@/` alias for src imports (configured in tsconfig.json)
- Group imports: external libraries → internal utilities → components
- Prefer named exports over default exports for utilities

## Component Structure
- Each component file should export its Props interface
- Use functional components with TypeScript
- Keep components focused on single responsibility
- Extract complex logic into custom hooks

## Configuration Files Location
- Build configs in root: `vite.config.ts`, `tailwind.config.js`
- IDE configs in `.kiro/` directory
- Documentation in `.trae/documents/` (Chinese docs)
- Deployment config: `vercel.json` in root