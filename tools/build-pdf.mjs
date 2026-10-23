// 포트폴리오 PDF 생성 스크립트
// 사용법 (site 폴더에서): npm i -D playwright && npx playwright install chromium && node tools/build-pdf.mjs
// 결과: assets/pdf/uptYYMMDD_김보영_서비스기획_포트폴리오.pdf
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dateParts = Object.fromEntries(
  new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]),
);
const dateStamp = `${dateParts.year}${dateParts.month}${dateParts.day}`;
const datedPdfPath = join(root, 'assets', 'pdf', `upt${dateStamp}_김보영_서비스기획_포트폴리오.pdf`);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(join(root, p));
    res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0, '127.0.0.1');
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
await page.goto(url, { waitUntil: 'load' });
await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: datedPdfPath,
  format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="width:100%;font-size:8px;color:#a3a3a3;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>김보영 · 서비스 기획 포트폴리오</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
});
await browser.close(); server.close();
await import('./generate-pdf-manifest.mjs');
console.log(`✓ ${datedPdfPath}`);
