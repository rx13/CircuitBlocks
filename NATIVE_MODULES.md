# Native Module Management for CircuitBlocks

This document explains how CircuitBlocks handles native Node.js modules that need to be compiled for specific Electron versions.

## Overview

CircuitBlocks uses several native modules that require compilation:
- **lzma-native**: Compression/decompression functionality
- **@serialport/bindings-cpp**: Serial port communication with devices
- **platform-folders**: Cross-platform folder access

These modules must be compiled for the specific Node.js ABI version used by Electron, not the system Node.js version.

## Automatic Rebuild System

### Postinstall Hook
After `npm install` or `yarn install`, native modules are automatically rebuilt via the `postinstall` script:

```bash
npm install  # Automatically rebuilds native modules
```

### Manual Rebuild
If you encounter native module issues, you can manually rebuild:

```bash
# Standard rebuild
npm run rebuild-native

# Force rebuild (cleans node_modules first)
npm run rebuild-native-force
```

## Robust Rebuild Strategy

The rebuild system uses a multi-layered approach with automatic fallbacks:

1. **Primary Method**: `electron-builder install-app-deps`
2. **Fallback 1**: `@electron/rebuild` for all modules
3. **Fallback 2**: `@electron/rebuild` for individual modules
4. **Fallback 3**: Direct `node-gyp rebuild` with Electron-specific environment

## Troubleshooting

### Common Issues

**Problem**: `node-gyp failed to rebuild` errors
**Solution**: 
```bash
npm run rebuild-native-force
```

**Problem**: Module loads but crashes at runtime
**Solution**: Ensure you're running the correct Electron version:
```bash
npx @electron/rebuild --version 37.2.5 --arch x64
```

**Problem**: Python/build tools missing
**Solution**: Install build dependencies:

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential python3-dev
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Install Python 3.11+
- Install Visual Studio Build Tools or Visual Studio Community

### Environment Variables

For manual control, you can set these environment variables:

```bash
export npm_config_target=37.2.5        # Electron version
export npm_config_runtime=electron     # Target runtime
export npm_config_arch=x64             # Target architecture
export npm_config_build_from_source=true
```

### CI/CD Environments

The project includes GitHub Actions workflows that test native module rebuilds across:
- **Operating Systems**: Ubuntu, Windows, macOS
- **Node.js Versions**: 18.x, 20.x

For other CI systems, ensure:
1. Python 3.11+ is available
2. Build tools are installed (gcc, make, Visual Studio Build Tools)
3. Use `npm ci --ignore-scripts` followed by `npm run rebuild-native`

## Architecture Details

### Electron Version Compatibility

| Electron Version | Node.js Version | ABI Version |
|-----------------|----------------|-------------|
| 37.2.5          | 22.x           | 136         |
| 29.x            | 20.x           | 115         |
| 25.x            | 18.x           | 108         |

The rebuild system automatically detects the Electron version from `package.json` and rebuilds modules for the correct ABI.

### Module-Specific Notes

**lzma-native**: 
- Most problematic module due to complex C++ compilation
- Requires liblzma library build during installation
- May need additional system dependencies on some platforms

**@serialport/bindings-cpp**:
- Generally rebuilds cleanly
- Required for device communication functionality

**platform-folders**:
- Simple native module
- Rarely causes issues

## Development Workflow

### Fresh Environment Setup
```bash
git clone <repository>
cd CircuitBlocks
npm install  # Automatically rebuilds native modules
npm run build
npm run dev
```

### After Electron Version Updates
```bash
npm run rebuild-native-force
```

### Verifying Native Modules
The rebuild script automatically verifies that all native modules can be loaded:

```bash
node -e "
  ['lzma-native', '@serialport/bindings-cpp', 'platform-folders'].forEach(mod => {
    try {
      require(mod);
      console.log('[OK]', mod, 'OK');
    } catch (e) {
      console.error('[FAIL]', mod, 'FAILED');
    }
  });
"
```

## Contributing

When contributing changes that affect native modules:

1. Test on multiple platforms (use GitHub Actions)
2. Verify the rebuild system works after your changes
3. Update this documentation if you add new native dependencies
4. Consider the impact on CI/CD and fresh installs

## Support

If you encounter persistent native module issues:

1. Check GitHub Issues for similar problems
2. Run `npm run rebuild-native-force` 
3. Verify your build tools are properly installed
4. Include your OS, Node.js version, and full error output in bug reports
