import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { jsonFetch, getJson } from '../../src/lib/jsonFetch';

let server: Server;
let base: string;
beforeAll(async () => {
  server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/ok') return res.end(JSON.stringify({ saved: true }));
    res.statusCode = 422;
    res.end(JSON.stringify(req.url === '/message' ? { message: 'موجودی کافی نیست' } : { error: 'قیمت نامعتبر' }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())));

it('returns the actual successful JSON body', async () => {
  expect(await jsonFetch(`${base}/ok`)).toEqual({ saved: true });
});
it.each([jsonFetch, getJson])('preserves error and message response contracts (%s)', async fetchJson => {
  await expect(fetchJson(`${base}/error`)).rejects.toMatchObject({ message: 'قیمت نامعتبر', status: 422 });
  await expect(fetchJson(`${base}/message`)).rejects.toMatchObject({ message: 'موجودی کافی نیست', status: 422 });
});
