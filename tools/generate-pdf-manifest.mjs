import { open, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pdfDir = join(root, 'assets', 'pdf');
const manifestPath = join(pdfDir, 'latest.json');

// Match document categories, not complete filenames, so newer upt-dated uploads
// are picked up without changing code. Unicode escapes keep this source portable.
const documents = [
  {
    key: 'portfolio',
    label: 'portfolio',
    matches: (name) => !name.toLowerCase().includes('prd'),
  },
  {
    key: 'bbodeuk',
    label: 'bbodeuk PRD',
    matches: (name) => name.includes('\ubf40\ub4dd\ubf40\ub4dd') && name.toLowerCase().includes('prd'),
  },
  {
    key: 'doitkit',
    label: 'doitkit PRD',
    matches: (name) => name.includes('\ub450\uc787\ud0b7') && name.toLowerCase().includes('prd'),
  },
  {
    key: 'samguk',
    label: 'samguk PRD',
    matches: (name) => name.includes('\uc0bc\uad6d\uc9c0') && name.toLowerCase().includes('prd'),
  },
];

function dateFromName(name) {
  const match = name.match(/^upt[_-]?(\d{8}|\d{6})(?:[_-]|$)/i);
  if (!match) return 0;

  const value = match[1];
  return Number(value.length === 8 ? value : `20${value}`);
}

async function isPdf(path) {
  const handle = await open(path, 'r');
  try {
    const signature = Buffer.alloc(5);
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0);
    return bytesRead === signature.length && signature.toString('ascii') === '%PDF-';
  } finally {
    await handle.close();
  }
}

const names = await readdir(pdfDir);
const manifest = {};

for (const document of documents) {
  const candidates = [];

  for (const name of names) {
    if (!/^upt/i.test(name) || !name.toLowerCase().endsWith('.pdf') || !document.matches(name)) continue;

    const path = join(pdfDir, name);
    const info = await stat(path);
    candidates.push({ name, path, date: dateFromName(name), modified: info.mtimeMs });
  }

  candidates.sort((a, b) =>
    b.date - a.date ||
    b.modified - a.modified ||
    b.name.localeCompare(a.name, 'ko', { numeric: true }),
  );

  const latest = candidates[0];
  if (!latest) throw new Error(`${document.label}: no matching upt-dated PDF found`);
  if (!(await isPdf(latest.path))) throw new Error(`${latest.name}: invalid PDF signature`);

  manifest[document.key] = latest.name;
  console.log(`${document.label}: ${latest.name}`);
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`PDF manifest: ${manifestPath}`);
