# Technical Documentation - tsconfig.json

## Overview

`tsconfig.json` is the TypeScript configuration file for the Banjin CLI project. It defines how TypeScript compiles the source code and enforces strict type checking and project structure.

## Structure and Components

### Compiler Options

#### Target and Module System
```json
{
  "target": "ES2020",
  "module": "CommonJS"
}
```

- **target**: JavaScript version to compile to (ES2020 features)
- **module**: Module system (CommonJS for Node.js compatibility)

#### Source and Output Directories
```json
{
  "rootDir": "./src",
  "outDir": "./dist"
}
```

- **rootDir**: Source code root directory
- **outDir**: Compiled JavaScript output directory

#### Type Checking Strictness
```json
{
  "strict": true,
  "esModuleInterop": true,
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true,
  "resolveJsonModule": true
}
```

- **strict**: Enables all strict type checking options
- **esModuleInterop**: Allows interoperability between CommonJS and ES modules
- **skipLibCheck**: Skips type checking of declaration files for faster compilation
- **forceConsistentCasingInFileNames**: Ensures consistent file name casing
- **resolveJsonModule**: Allows importing JSON files as modules

### File Inclusion/Exclusion

#### Included Files
```json
{
  "include": ["src/**/*"]
}
```

- **include**: Only compiles files in the `src/` directory and subdirectories

#### Excluded Files
```json
{
  "exclude": [
    "node_modules",
    "src/**/*.test.ts",
    "src/**/__tests__/**",
    "src/test/**"
  ]
}
```

- **exclude**: Files and directories to exclude from compilation
- **node_modules**: Dependencies (automatically excluded)
- **Test files**: All test files are excluded from production build

## Key Features

### 1. **Strict Type Safety**
- `strict: true` enables comprehensive type checking
- Prevents runtime errors through compile-time validation
- Enforces null/undefined safety

### 2. **Node.js Compatibility**
- `target: "ES2020"` provides modern JavaScript features
- `module: "CommonJS"` ensures Node.js compatibility
- `esModuleInterop: true` allows importing ES modules

### 3. **Clean Build Output**
- Source maps and test files excluded from `dist/`
- Only production code is compiled and packaged

### 4. **JSON Module Support**
- `resolveJsonModule: true` allows importing configuration files
- Enables type-safe access to JSON configuration

## Relationships with Other Files

- **package.json**: Defines build scripts that use this configuration
- **src/**: Source TypeScript files compiled according to these settings
- **dist/**: Generated JavaScript output directory
- **jest.config.js**: Test configuration that may reference TypeScript settings

## Compilation Process

### Build Command
```bash
npm run build  # Executes: tsc
```

This compiles all TypeScript files from `src/` to JavaScript in `dist/`, following the configuration rules.

### Development Mode
```bash
npm start  # Executes: tsc && node dist/index.js
```

Compiles and immediately runs the application for development testing.

## TypeScript Strict Mode Benefits

### Enabled by `strict: true`:
- **noImplicitAny**: Variables must have explicit types
- **strictNullChecks**: Null/undefined safety
- **strictFunctionTypes**: Function parameter variance checking
- **noImplicitReturns**: All code paths must return values
- **noFallthroughCasesInSwitch**: Switch statements must be exhaustive

### Impact on Code Quality:
- **Runtime Safety**: Prevents common JavaScript errors
- **IDE Support**: Better autocomplete and refactoring
- **Documentation**: Types serve as inline documentation
- **Maintainability**: Easier to modify and extend code

## Common Issues and Solutions

### 1. **Import Errors**
```typescript
// Error: Cannot find module './utils'
import { helper } from './utils';
// Solution: Ensure file exists and has .ts extension
```

### 2. **Type Errors**
```typescript
// Error: Object is possibly 'undefined'
const result = obj.property;
// Solution: Add null check or use optional chaining
const result = obj?.property;
```

### 3. **Module Resolution**
```typescript
// Error: Cannot resolve module
import config from '../config.json';
// Solution: Ensure resolveJsonModule is enabled (it is)
```

## Performance Considerations

- **skipLibCheck**: Improves compilation speed by ~50%
- **incremental compilation**: TypeScript caches for faster rebuilds
- **target ES2020**: Balances modern features with Node.js compatibility

## Best Practices

1. **Use explicit types** instead of `any`
2. **Enable strict mode** for maximum type safety
3. **Keep interfaces** in separate files for reusability
4. **Use path mapping** for cleaner imports (if needed)
5. **Regular type checking** during development

This configuration ensures Banjin maintains high code quality and type safety throughout development.</content>
<parameter name="filePath">/Users/dragneaadrian/Working/Banjin/documentatie-tehnica/tsconfig.json.md