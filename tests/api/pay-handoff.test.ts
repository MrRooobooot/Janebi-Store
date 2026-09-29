import { describe, it, expect } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { payLinkFor } from '../../server/routes/payment.js';
import { env } from '../../server/env.js';

// Measured on the live gateway (authority A…gooevxmr, 2026-09-29): StartPay answers
// 200 + the payment form for a Referer of janebiarena.ir (apex, www, http, with a
// path — all identical) and 400 «دسترسی از این دامنه مجاز نمی باشد» with none.
// A 302 does not supply one (the redirect hop forwards the original request's empty
// referrer); a document navigating from our own origin does. Hence this handoff page.
const AUTH = 'A000000000000000000000000000gooevxmr';
const TARGET = `https://www.zarinpal.com/pg/StartPay/${AUTH}`;

describe('payLinkFor — customer link stays on our origin', () => {
  it('reroutes a live StartPay URL through /pay/<authority>', () => {
    expect(payLinkFor(TARGET, AUTH)).toBe(`${env.APP_URL}/pay/${AUTH}`);
    expect(payLinkFor(`https://sandbox.zarinpal.com/pg/StartPay/${AUTH}`, AUTH)).toBe(`${env.APP_URL}/pay/${AUTH}`);
  });

  it('leaves the dev/test self-verify shortcut and unknown URLs untouched', () => {
    const dev = `/api/payment/verify?Status=OK&Authority=${AUTH}`;
    expect(payLinkFor(dev, AUTH)).toBe(dev);
    expect(payLinkFor('', AUTH)).toBe('');
    expect(payLinkFor('https://saman.example/sep/xyz', AUTH)).toBe('https://saman.example/sep/xyz');
  });
});

describe('GET /pay/:authority — Zarinpal handoff', () => {
  it('serves a document that hands the browser off to StartPay', async () => {
    const res = await request(app).get(`/pay/${AUTH}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['referrer-policy']).toContain('strict-origin'); // the hop needs a Referer
    expect(res.text).toContain(`content="0;url=${TARGET}"`);
    expect(res.text).toContain(`href="${TARGET}"`); // works even if the meta refresh is ignored
  });

  it('answers 400 for anything that is not a bare gateway authority (no open redirect)', async () => {
    for (const bad of ['short', 'A'.repeat(65), 'A_B-C', 'evil.example', 'A?x=1', 'PENDING:uuid']) {
      const res = await request(app).get(`/pay/${encodeURIComponent(bad)}`);
      expect(res.status, `${bad} must be refused`).toBe(400);
    }
  });
});
