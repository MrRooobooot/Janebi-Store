import { describe, it, expect } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';

describe('Contact API Integration Tests', () => {
  it('POST /api/contact should return 400 when missing required fields', async () => {
    // Missing name
    const resNoName = await request(app)
      .post('/api/contact')
      .send({
        email: 'test@example.com',
        message: 'پیام تست بدون نام'
      });
    expect(resNoName.status).toBe(400);
    expect(resNoName.body.error).toContain('الزامی است');

    // Missing email
    const resNoEmail = await request(app)
      .post('/api/contact')
      .send({
        name: 'علی رضایی',
        message: 'پیام تست بدون ایمیل'
      });
    expect(resNoEmail.status).toBe(400);
    expect(resNoEmail.body.error).toContain('الزامی است');

    // Missing message
    const resNoMsg = await request(app)
      .post('/api/contact')
      .send({
        name: 'علی رضایی',
        email: 'test@example.com'
      });
    expect(resNoMsg.status).toBe(400);
    expect(resNoMsg.body.error).toContain('الزامی است');
  });

  it('POST /api/contact should submit valid contact form with 200', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({
        name: 'رضا محمدی',
        email: 'reza@example.com',
        phone: '09123456789',
        subject: 'استعلام موجودی کالا',
        message: 'سلام، آیا محصول قاب سیلیکونی مجددا شارژ می‌شود؟'
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('با موفقیت ارسال شد');
  });
});
