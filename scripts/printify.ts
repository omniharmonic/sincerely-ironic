/**
 * Printify API client.
 *
 * Small on purpose: a fetch wrapper that carries the auth and the User-Agent
 * Printify insists on, retries the failures worth retrying, and keeps the
 * request rate under the published ceilings (600/min overall, 100/min on
 * catalog, and errors must stay under 5% of traffic).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SHOP_ID = '12124343';
const BASE = 'https://api.printify.com/v1';

let token: string | null = null;

/** The token lives in .env.local; it is never logged. */
export async function loadToken(): Promise<string> {
  if (token) return token;
  const env = await readFile(path.resolve('.env.local'), 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('PRINTIFY_API_TOKEN='));
  if (!line) throw new Error('PRINTIFY_API_TOKEN is not in .env.local');
  token = line.slice('PRINTIFY_API_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
  if (!token) throw new Error('PRINTIFY_API_TOKEN is empty');
  return token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Keeps successive calls at least this far apart. */
let lastCall = 0;
const MIN_GAP_MS = 120;

export class PrintifyError extends Error {
  // Plain fields rather than parameter properties: Node's type-stripping
  // runs these scripts without a compile step, and parameter properties
  // need one.
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'PrintifyError';
    this.status = status;
    this.body = body;
  }
}

export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  route: string,
  body?: unknown,
): Promise<T> {
  const auth = await loadToken();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const wait = Math.max(0, lastCall + MIN_GAP_MS - Date.now());
    if (wait) await sleep(wait);
    lastCall = Date.now();

    const res = await fetch(`${BASE}${route}`, {
      method,
      headers: {
        Authorization: `Bearer ${auth}`,
        // Printify rejects requests without one.
        'User-Agent': 'SincerelyIronic',
        'Content-Type': 'application/json;charset=utf-8',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.ok) return (await res.json()) as T;

    const text = await res.text();
    // Back off on rate limiting and transient server faults; anything else is
    // a real answer and should surface immediately.
    if (res.status === 429 || res.status >= 500) {
      const backoff = 1000 * 2 ** attempt;
      console.warn(`  ${res.status} on ${route} — retrying in ${backoff}ms`);
      await sleep(backoff);
      continue;
    }
    throw new PrintifyError(`${method} ${route} → ${res.status}`, res.status, text.slice(0, 500));
  }
  throw new PrintifyError(`${method} ${route} → gave up after retries`, 0, '');
}
