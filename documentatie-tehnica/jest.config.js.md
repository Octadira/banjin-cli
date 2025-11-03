# Technical Documentation - jest.config.js

## Overview

`jest.config.js` is the Jest testing framework configuration file for the Banjin CLI project. It configures how tests are run, including TypeScript support, test environment, and module mocking.

## Structure and Components

### Configuration Object
```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^chalk$': '<rootDir>/src/test/mocks/chalk.ts',
  },
};
```

### Key Configuration Options

#### Preset
```javascript
{
  "preset": "ts-jest"
}
```

- **preset**: Uses `ts-jest` preset for TypeScript support
- **Benefits**: Automatic TypeScript compilation for tests, type checking, and ES module support

#### Test Environment
```javascript
{
  "testEnvironment": "node"
}
```

- **testEnvironment**: Runs tests in Node.js environment
- **Purpose**: Suitable for CLI applications and server-side testing
- **Features**: Provides Node.js globals (`process`, `Buffer`, etc.)

#### Module Name Mapper
```javascript
{
  "moduleNameMapper": {
    "^chalk$": "<rootDir>/src/test/mocks/chalk.ts"
  }
}
```

- **moduleNameMapper**: Maps module imports to mock implementations
- **chalk mock**: Replaces the `chalk` library with a test mock
- **Purpose**: Controls terminal output during testing, prevents color codes in test output

## Key Features

### 1. **TypeScript Integration**
- Automatic compilation of `.ts` and `.tsx` test files
- Type checking during test execution
- Support for modern TypeScript features

### 2. **Node.js Environment**
- Tests run in Node.js runtime
- Access to Node.js APIs and modules
- Suitable for CLI and backend testing

### 3. **Module Mocking**
- Selective mocking of dependencies
- Controlled test environment
- Isolation of external dependencies

## Test File Discovery

### Default Patterns
Jest automatically discovers test files with these patterns:
- `**/__tests__/**/*.js`
- `**/?(*.)+(spec|test).js`
- `**/__tests__/**/*.ts`
- `**/?(*.)+(spec|test).ts`

### Current Test Files
Based on project structure:
- `src/commands.test.ts` - Tests for command system
- `src/tools.test.ts` - Tests for tool system
- `src/test/mocks/chalk.ts` - Mock implementation

## Relationships with Other Files

- **package.json**: Defines the `test` script that runs Jest
- **tsconfig.json**: TypeScript configuration affects test compilation
- **src/test/mocks/**: Directory containing mock implementations
- **src/**/*.test.ts**: Test files that use this configuration

## Test Execution

### Running Tests
```bash
npm test  # Executes: jest
```

### Test Command Details
- Uses the `ts-jest` preset for TypeScript compilation
- Runs in Node.js environment
- Applies module mapping for controlled dependencies
- Generates coverage reports (if configured)

## Mock System

### Chalk Mock Implementation
The chalk mock (`src/test/mocks/chalk.ts`) provides:
```typescript
// Mock that returns plain strings instead of colored output
export default {
  green: (text: string) => text,
  red: (text: string) => text,
  blue: (text: string) => text,
  // ... other colors
};
```

### Benefits of Mocking
- **Consistent Output**: Tests don't produce colored terminal output
- **Predictable Results**: No ANSI escape sequences in test output
- **Faster Execution**: Avoids terminal I/O operations
- **CI/CD Friendly**: Works in environments without color support

## Test Coverage

### Current Coverage
Based on project information:
- **98 passing tests** across command and tool functionality
- **Unit tests**: Individual command and utility testing
- **Integration tests**: End-to-end command flows

### Coverage Areas
- Command parsing and execution
- Tool calling and response handling
- Error handling and edge cases
- SSH connection management
- Configuration loading and validation

## Best Practices

### 1. **Test Organization**
- Keep test files alongside source files
- Use descriptive test names
- Group related tests in `describe` blocks

### 2. **Mock Usage**
- Mock external dependencies (APIs, file system, network)
- Use realistic mock data
- Test both success and error scenarios

### 3. **Assertion Style**
- Use descriptive assertion messages
- Test both positive and negative cases
- Verify side effects and state changes

### 4. **Test Isolation**
- Each test should be independent
- Clean up after tests (if needed)
- Avoid shared state between tests

## Common Test Patterns

### Command Testing
```typescript
describe('/help command', () => {
  it('should display help text', () => {
    const mockState = createMockState();
    const result = handleHelp(mockState, []);
    expect(result).toBe(false); // Command handled successfully
  });
});
```

### Tool Testing
```typescript
describe('tool execution', () => {
  it('should handle successful tool calls', async () => {
    const mockState = createMockState();
    const result = await executeTool(mockState, toolArgs);
    expect(result).toContain('success');
  });
});
```

## Performance Considerations

- **Parallel Execution**: Jest runs tests in parallel by default
- **Caching**: TypeScript compilation is cached between runs
- **Selective Testing**: Can run specific test files or patterns
- **Watch Mode**: `jest --watch` for continuous testing during development

## Troubleshooting

### Common Issues

1. **Type Errors in Tests**
   - Ensure test files have `.test.ts` extension
   - Check TypeScript configuration compatibility

2. **Mock Import Errors**
   - Verify mock file paths in `moduleNameMapper`
   - Ensure mock files export correct interfaces

3. **Environment Issues**
   - Tests run in isolated Node.js environment
   - File system and network access may need mocking

This configuration ensures reliable, fast, and comprehensive testing for the Banjin CLI application.</content>
<parameter name="filePath">/Users/dragneaadrian/Working/Banjin/documentatie-tehnica/jest.config.js.md