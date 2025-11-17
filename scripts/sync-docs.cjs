#!/usr/bin/env node
/*
 * Simple docs sync script for GitHub Pages.
 * - Assumes Vite has just written the production build into ./dist
 * - Copies dist -> docs while preserving docs/CNAME if present
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const docsDir = path.join(root, 'docs');

/** Recursively remove all files/dirs except a specific allowlist */
function cleanDocsExceptCname(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.lstatSync(full);
    if (entry.toLowerCase() === 'cname' && stat.isFile()) continue;
    if (stat.isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      fs.unlinkSync(full);
    }
  }
}

/** Recursively copy dist -> docs */
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.lstatSync(srcPath);
    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (stat.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(distDir)) {
  console.error('[sync-docs] dist directory does not exist; run `npm run build` first.');
  process.exit(1);
}

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

console.log('[sync-docs] Cleaning docs (preserving CNAME if present)...');
cleanDocsExceptCname(docsDir);

console.log('[sync-docs] Copying dist -> docs...');
copyRecursive(distDir, docsDir);

console.log('[sync-docs] Done.');
