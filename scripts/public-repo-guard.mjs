#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const forbiddenFilePatterns = [
  /^\.env(\..+)?$/i,
  /id_rsa/i,
  /id_ed25519/i,
  /service-account.*\.json$/i,
  /credentials?.*\.json$/i,
  /secret/i,
  /private/i,
  /\.pem$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /\.key$/i,
];

const textExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.txt', '.env', '.ini', '.toml', '.xml', '.html', '.css', '.scss', '.sql', '.ps1',
]);

const contentRules = [
  { name: 'Google API key', re: /AIza[0-9A-Za-z\-_]{35}/g },
  { name: 'OpenAI secret key', re: /sk-[A-Za-z0-9]{20,}/g },
  { name: 'GitHub token', re: /ghp_[A-Za-z0-9]{36}/g },
  { name: 'Private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'Hardcoded secret assignment', re: /(api[_-]?key|token|secret|password|private[_-]?key)\s*[:=]\s*['"][^'"\n]{8,}['"]/gi },
];

const allowSnippets = [
  'process.env.',
  'example',
  'placeholder',
  'YOUR_',
  'REPLACE_ME',
  'xxxxx',
];

function getTrackedFiles() {
  const out = execSync('git ls-files', { encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (textExtensions.has(ext)) return true;
  const base = path.basename(filePath).toLowerCase();
  return base === 'dockerfile' || base === '.env' || base.endsWith('.env.example');
}

function shouldIgnoreLine(line) {
  const lower = line.toLowerCase();
  return allowSnippets.some((snippet) => lower.includes(snippet.toLowerCase()));
}

const violations = [];

for (const relPath of getTrackedFiles()) {
  const normalized = relPath.replace(/\\/g, '/');
  const base = path.basename(normalized);

  if (forbiddenFilePatterns.some((re) => re.test(base) || re.test(normalized))) {
    if (!/\.env\.example$/i.test(base)) {
      violations.push(`${normalized}: forbidden sensitive filename pattern`);
      continue;
    }
  }

  if (!isTextFile(normalized)) continue;

  let content = '';
  try {
    content = fs.readFileSync(path.join(repoRoot, normalized), 'utf8');
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (shouldIgnoreLine(line)) continue;

    for (const rule of contentRules) {
      rule.re.lastIndex = 0;
      if (rule.re.test(line)) {
        violations.push(`${normalized}:${i + 1} potential ${rule.name}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('repo-guard failed. Potential sensitive data detected:\n');
  for (const v of violations) {
    console.error(`- ${v}`);
  }
  console.error('\nIf this is intentional, replace real values with placeholders before publishing.');
  process.exit(1);
}

console.log('repo-guard passed: no obvious sensitive leaks detected.');
