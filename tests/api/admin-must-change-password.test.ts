import { describe, it, expect, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { users } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Admin first-login mandatory password change:
// - login response carries mustChangePassword
// - every admin API 403s with code PASSWORD_CHANGE_REQUIRED until changed
// - PUT /api/users/me/password clears the flag and unlocks the panel
describe('Admin must-change-password gate', () => {
  const phone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const adminId = `usr-test-mcp-${Date.now()}`;
  let token: string;

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, adminId));
  });

  it('setup: create admin with mustChangePassword=1', async () => {
    await db.insert(users).values({
      id: adminId,
      name: 'ادمین آزمون تغییر اجباری رمز',
      phone,
      password: await bcrypt.hash('1234', 10),
      role: 'admin',
      mustChangePassword: true,
    });
  });

  it('login returns mustChangePassword=true', async () => {
    const res = await request(app).post('/api/auth/login').send({ phone, password: '1234' });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
    expect(res.body.user.mustChangePassword).toBeUndefined(); // flag lives at top level
    token = res.body.accessToken;
  });

  it('admin API 403s with PASSWORD_CHANGE_REQUIRED while flag set', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('changing password clears the flag and unlocks admin APIs', async () => {
    const change = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: '1234', newPassword: 'newSecurePass99' });
    expect(change.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.mustChangePassword).toBe(false);

    const admin = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(admin.status).toBe(200);
  });

  it('re-login reports mustChangePassword=false', async () => {
    const res = await request(app).post('/api/auth/login').send({ phone, password: 'newSecurePass99' });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(false);
  });

  it('normal admin without the flag is not gated', async () => {
    const phone2 = '09' + Math.floor(100000000 + Math.random() * 900000000);
    const id2 = `usr-test-mcp2-${Date.now()}`;
    try {
      await db.insert(users).values({
        id: id2,
        name: 'ادمین بدون قفل',
        phone: phone2,
        password: await bcrypt.hash('normal123', 10),
        role: 'admin',
      });
      const login = await request(app).post('/api/auth/login').send({ phone: phone2, password: 'normal123' });
      expect(login.body.mustChangePassword).toBe(false);
      const stats = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${login.body.accessToken}`);
      expect(stats.status).toBe(200);
    } finally {
      await db.delete(users).where(eq(users.id, id2));
    }
  });
});
