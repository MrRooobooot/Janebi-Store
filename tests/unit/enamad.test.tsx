import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../../src/components/Footer';
import fs from 'fs';
import path from 'path';

// Mock contexts and hooks needed by Footer
vi.mock('../../src/contexts/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../../src/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({
    phone: '۰۲۱-۸۸۸۸۹۹۹۹',
    email: 'info@janebiarena.ir',
    supportHours: '۷ روز هفته، ۹ صبح تا ۹ شب',
  }),
}));

describe('eNamad Trust Seal Invariants', () => {
  it('enforces rel="noopener" without noreferrer so Referer header is sent to enamad.ir', () => {
    const html = renderToString(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // Extract enamad anchor
    const match = html.match(/<a[^>]*trustseal\.enamad\.ir[^>]*>/);
    expect(match).not.toBeNull();
    const anchorHtml = match ? match[0] : '';

    expect(anchorHtml).toContain('rel="noopener"');
    expect(anchorHtml).not.toContain('noreferrer');
    expect(anchorHtml.toLowerCase()).toContain('referrerpolicy="origin"');
    expect(anchorHtml).toContain('id=7152119');
    expect(anchorHtml).toContain('Code=m5ul5GVYe8T1P3vUR5nqi0IJeI1JvnPU');
  });

  it('guarantees local fallback asset public/enamad-logo.png exists and is non-empty', () => {
    const fallbackPath = path.resolve(__dirname, '../../public/enamad-logo.png');
    expect(fs.existsSync(fallbackPath)).toBe(true);
    const stats = fs.statSync(fallbackPath);
    expect(stats.size).toBeGreaterThan(1000);
  });

  it('verifies index.html has matching enamad domain verification token', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');
    expect(indexHtml).toContain('<meta name="enamad" content="41543389" />');
  });
});
