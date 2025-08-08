#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const bumpType = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node version-bump.js [patch|minor|major]');
  process.exit(1);
}

function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
    default:
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

function updatePackageJson(filePath, newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const oldVersion = packageJson.version;
  packageJson.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`Updated ${filePath}: ${oldVersion} → ${newVersion}`);
  return oldVersion;
}

try {
  // Read current version from root package.json
  const rootPackagePath = path.join(__dirname, '../package.json');
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  const currentVersion = rootPackage.version;
  const newVersion = bumpVersion(currentVersion, bumpType);

  console.log(`Bumping version: ${currentVersion} → ${newVersion} (${bumpType})`);

  // Update root package.json
  const oldRootVersion = updatePackageJson(rootPackagePath, newVersion);

  // Update client package.json
  const clientPackagePath = path.join(__dirname, '../client/package.json');
  const oldClientVersion = updatePackageJson(clientPackagePath, newVersion);

  // Create git commit and tag
  try {
    execSync('git add package.json client/package.json', { stdio: 'inherit' });
    execSync(`git commit -m "Bump version to ${newVersion}"`, { stdio: 'inherit' });
    execSync(`git tag -a v${newVersion} -m "Version ${newVersion}"`, { stdio: 'inherit' });
    console.log(`Created git commit and tag v${newVersion}`);
  } catch (gitError) {
    console.warn('Git operations failed (this is normal if not in a git repo):', gitError.message);
  }

  console.log(`[OK] Version bump complete: ${currentVersion} → ${newVersion}`);
} catch (error) {
  console.error('[FAIL] Version bump failed:', error.message);
  process.exit(1);
}
