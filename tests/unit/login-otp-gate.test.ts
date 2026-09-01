import { describe, it, expect } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { resolveOtpStatus } from '../../src/lib/otp.js';

// Login gates the OTP reset UI behind GET /api/auth/otp/status. Fail-safe
// rule: anything other than an explicit enabled=true hides the OTP UI.
describe('OTP UI gate (resolveOtpStatus)', () => {
  it('enables OTP only for explicit { enabled: true }', () => {
    expect(resolveOtpStatus({ enabled: true }).otpEnabled).toBe(true);
  });

  it('hides OTP for disabled, malformed, or missing payloads (fail-safe)', () => {
    for (const payload of [
      { enabled: false },
      {},
      { enabled: 'true' },
      { enabled: 1 },
      null,
      undefined,
      'ok',
      ['enabled'],
    ]) {
      expect(resolveOtpStatus(payload).otpEnabled, JSON.stringify(payload)).toBe(false);
    }
  });

  it('GET /api/auth/otp/status returns the { enabled: boolean } contract', async () => {
    const res = await request(app).get('/api/auth/otp/status');
    expect(res.status).toBe(200);
    expect(typeof res.body.enabled).toBe('boolean');
  });
});
