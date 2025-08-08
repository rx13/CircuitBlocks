#!/usr/bin/env node

/**
 * Robust native module rebuild script for CircuitBlocks
 * Handles electron-builder and @electron/rebuild with proper fallbacks
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const ELECTRON_VERSION = '37.2.5';
const NATIVE_MODULES = ['lzma-native', '@serialport/bindings-cpp', 'platform-folders'];

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function getElectronVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const electronDep = packageJson.dependencies?.electron || packageJson.devDependencies?.electron;
    if (electronDep) {
      return electronDep.replace(/[^0-9.]/g, '');
    }
  } catch (error) {
    log(`Warning: Could not read electron version from package.json: ${error.message}`, 'WARN');
  }
  return ELECTRON_VERSION;
}

function runCommand(command, description, options = {}) {
  log(`Starting: ${description}`);
  try {
    const result = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, ...options.env },
      ...options
    });
    log(`[OK] Completed: ${description}`);
    return { success: true, output: result };
  } catch (error) {
    log(`[FAIL] Failed: ${description} - ${error.message}`, 'ERROR');
    return { success: false, error };
  }
}

async function rebuildNativeModules() {
  const electronVersion = getElectronVersion();
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  
  log(`Starting native module rebuild for Electron ${electronVersion} (${arch})`);
  
  // Method 1 removed: electron-builder install-app-deps

  // Method 2: Try @electron/rebuild for all modules
  log('Method 1: Attempting @electron/rebuild for all native modules...');
  const rebuildAllResult = runCommand(
    `npx @electron/rebuild --version ${electronVersion} --arch ${arch}`,
    '@electron/rebuild for all native modules',
    { timeout: 300000 }
  );
  
  if (rebuildAllResult.success) {
    log('[OK] @electron/rebuild for all modules succeeded');
    return true;
  }
  
  // Method 3: Try @electron/rebuild for each native module individually
  log('Method 3: Attempting @electron/rebuild for individual native modules...');
  let individualSuccess = true;
  
  for (const module of NATIVE_MODULES) {
    log(`Rebuilding ${module}...`);
    const result = runCommand(
      `npx @electron/rebuild --version ${electronVersion} --arch ${arch} --only ${module}`,
      `@electron/rebuild for ${module}`,
      { timeout: 300000 }
    );
    
    if (!result.success) {
      log(`[FAIL] Failed to rebuild ${module}`, 'ERROR');
      individualSuccess = false;
    } else {
      log(`[OK] Successfully rebuilt ${module}`);
    }
  }
  
  if (individualSuccess) {
    log('[OK] Individual module rebuilds succeeded');
    return true;
  }
  
  // Method 4: Try node-gyp rebuild directly for lzma-native (most problematic)
  log('Method 4: Attempting direct node-gyp rebuild for lzma-native...');
  const lzmaNativePath = path.join(process.cwd(), 'node_modules', 'lzma-native');
  
  if (fs.existsSync(lzmaNativePath)) {
    const nodeGypResult = runCommand(
      'node-gyp rebuild',
      'Direct node-gyp rebuild for lzma-native',
      { 
        cwd: lzmaNativePath,
        timeout: 300000,
        env: {
          npm_config_target: electronVersion,
          npm_config_runtime: 'electron',
          npm_config_arch: arch,
          npm_config_build_from_source: 'true'
        }
      }
    );
    
    if (nodeGypResult.success) {
      log('[OK] Direct node-gyp rebuild succeeded');
      return true;
    }
  }
  
  // If all methods failed
  log('[FAIL] All rebuild methods failed. This may require manual intervention.', 'ERROR');
  log('Consider running: npm run clean-install', 'ERROR');
  return false;
}

// Verification function
function verifyNativeModules() {
  log('Verifying native modules can be loaded...');
  
  for (const module of NATIVE_MODULES) {
    try {
      require(module);
      log(`[OK] ${module} loads successfully`);
    } catch (error) {
      log(`[FAIL] ${module} failed to load: ${error.message}`, 'ERROR');
      return false;
    }
  }
  
  log('[OK] All native modules verified successfully');
  return true;
}

// Main execution
async function main() {
  log('=== CircuitBlocks Native Module Rebuild Script ===');
  
  const rebuildSuccess = await rebuildNativeModules();
  
  if (rebuildSuccess) {
    log('Native module rebuild completed successfully');
    
    // Verify the modules work
    if (verifyNativeModules()) {
      log('[SUCCESS] All native modules are working correctly!');
      process.exit(0);
    } else {
      log('[WARN] Native modules rebuilt but verification failed', 'WARN');
      process.exit(1);
    }
  } else {
    log('[FAIL] Native module rebuild failed completely', 'ERROR');
    log('Please check the error messages above and consider:', 'ERROR');
    log('  1. Running: npm run clean-install', 'ERROR');
    log('  2. Checking your build tools are installed (python, make, gcc)', 'ERROR');
    log('  3. Verifying Node.js and Electron versions are compatible', 'ERROR');
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('Rebuild process interrupted', 'WARN');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('Rebuild process terminated', 'WARN');
  process.exit(143);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { rebuildNativeModules, verifyNativeModules };
