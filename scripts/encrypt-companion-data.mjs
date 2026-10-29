import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Keep the source JSON outside the repository; only encrypted data is published.
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/encrypt-companion-data.mjs /absolute/path/to/private-data.json [--password-stdin]');
const data = JSON.parse(await readFile(input, 'utf8'));
if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data.updated) || !Array.isArray(data.months) || data.months.length < 2 || !data.months.every((m,i,a) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && (!i || m>a[i-1])) || !Array.isArray(data.platforms) || !data.platforms.length || !data.platforms.every((p) => typeof p.name === 'string' && Array.isArray(p.visits) && p.visits.length === data.months.length && p.visits.some((v) => v !== null) && p.visits.every((v) => v === null || typeof v === 'number' && Number.isFinite(v) && v > 0)) || data.months.some((_,i) => data.platforms.every((p) => p.visits[i] === null))) throw new Error('Invalid source data');
async function readPassword() {
  if (process.argv.includes('--password-stdin')) {
    let value = '';
    for await (const chunk of process.stdin) value += chunk;
    return value.replace(/\r?\n$/, '');
  }
  if (!process.stdin.isTTY) throw new Error('Use a terminal to enter the password, or --password-stdin');
  process.stdout.write('Dashboard password (hidden): ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const handler = (chunk) => {
      for (const c of chunk.toString()) {
        if (c === '\u0003') { process.stdin.setRawMode(false); process.exit(130); }
        if (c === '\r' || c === '\n') {
          process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data',handler); process.stdout.write('\n'); resolve(value); return;
        }
        if (c === '\u007f' || c === '\b') value = value.slice(0,-1);
        else value += c;
      }
    };
    process.stdin.on('data', handler);
    process.stdin.on('error',reject);
  });
}
const password = await readPassword();
if (password.length < 10) throw new Error('Use a password of at least 10 characters');
const salt = randomBytes(16), iv = randomBytes(12), iterations = 600000;
const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final(),cipher.getAuthTag()]);
const output = fileURLToPath(new URL('../data/companion-traffic.encrypted.json', import.meta.url));
await writeFile(output, JSON.stringify({version:1,algorithm:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations,salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:ciphertext.toString('base64')},null,2)+'\n');
console.log('Encrypted dashboard data updated. Update the public last-updated date in companion-ai-analytics.html to match.');
