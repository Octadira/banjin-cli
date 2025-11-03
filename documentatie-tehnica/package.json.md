# Technical Documentation - package.json

## Overview

`package.json` is the main configuration file for the Banjin CLI Node.js project. It defines all project metadata, dependencies, scripts, and publishing configuration.

## Structure and Components

### Project Metadata
```json
{
  "name": "banjin",
  "version": "1.6.4",
  "description": "A CLI AI assistant",
  "author": "Octadira",
  "license": "MIT"
}
```

- **name**: Package name on NPM
- **version**: Current version (Semantic Versioning)
- **description**: Short project description
- **author**: Project author
- **license**: Open-source license (MIT)

### Executable Configuration
```json
{
  "main": "dist/index.js",
  "bin": {
    "banjin": "dist/index.js"
  }
}
```

- **main**: Main entry point for imports
- **bin**: Defines the global CLI command `banjin`

### NPM Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "start": "tsc && node dist/index.js",
    "test": "jest",
    "postinstall": "node -e 'try{require.resolve(\"marked\");require.resolve(\"marked-terminal\");}catch(e){process.exit(0)}'"
  }
}
```

- **build**: Compiles TypeScript to JavaScript
- **start**: Runs the application in development mode
- **test**: Executes the Jest test suite
- **postinstall**: Checks optional dependencies after installation

### System Requirements
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- **engines**: Specifies minimum required Node.js version

### Repository and Support
```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/octadira/banjin-cli.git"
  },
  "bugs": {
    "url": "https://github.com/octadira/banjin-cli/issues"
  },
  "homepage": "https://github.com/octadira/banjin-cli#readme"
}
```

- **repository**: Link to Git repository
- **bugs**: URL for bug reporting
- **homepage**: Project homepage

### Files Included in Package
```json
{
  "files": [
    "dist",
    "config.example.yaml",
    "mcp-servers.example.json",
    "context.md"
  ]
}
```

- **files**: Specifies which files to include in the published NPM package

### Dependencies

#### Production Dependencies
- **@inquirer/***: Libraries for interactive CLI interface
- **@modelcontextprotocol/sdk**: SDK for Model Context Protocol
- **axios**: HTTP client for API calls
- **chalk**: Terminal text coloring
- **marked/marked-terminal**: Markdown rendering in terminal
- **commander**: CLI argument parsing
- **glob**: File pattern matching
- **ora**: Spinner for long operations
- **ssh2**: SSH client for remote connections
- **yaml**: YAML parser/serializer

#### Development Dependencies
- **@types/***: TypeScript type definitions
- **jest**: Testing framework
- **ts-jest**: Jest integration with TypeScript
- **typescript**: TypeScript compiler

## Key Features

### 1. **Global CLI**
Allows global installation: `npm install -g banjin`

### 2. **Auto-dependency Verification**
Postinstall script checks if optional dependencies are available

### 3. **Strict Configuration**
- TypeScript strict typing
- Node.js 20+ requirement
- CommonJS module system

## Relationships with Other Files

- **tsconfig.json**: Configures TypeScript compilation
- **jest.config.js**: Configures testing
- **dist/**: Compilation output (generated from src/)
- **config.example.yaml**: User configuration template

## Modification Instructions

### Adding New Dependencies
```bash
npm install <package-name>
# For dev dependencies:
npm install --save-dev <package-name>
```

### Version Update
```bash
npm version patch  # 1.6.4 -> 1.6.5
npm version minor  # 1.6.4 -> 1.7.0
npm version major  # 1.6.4 -> 2.0.0
```

### Publishing to NPM
```bash
npm run build
npm publish
```

## Important Notes

- **Type: "commonjs"**: Uses CommonJS instead of ES modules
- **Files array**: Strictly controls what gets included in NPM package
- **Postinstall script**: Runs automatically after `npm install`
- **Repository links**: Maintained for community support</content>
<parameter name="filePath">/Users/dragneaadrian/Working/Banjin/documentatie-tehnica/package.json.md