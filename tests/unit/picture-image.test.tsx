import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import PictureImage from '../../src/components/PictureImage';

describe('PictureImage & Responsive Asset Pipeline', () => {
  it('renders standard raster with responsive srcset and modern format sources', () => {
    const html = renderToString(
      <PictureImage
        src="/products/test.png"
        alt="تست محصول"
        width={300}
        height={300}
      />
    );

    expect(html).toContain('<picture');
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('type="image/webp"');
    expect(html).toContain('test.avif');
    expect(html).toContain('1x');
    expect(html).toContain('2x');
    expect(html).toContain('test.webp');
    expect(html).toContain('test.png');
  });

  it('renders pure SVG without unnecessary raster source tags', () => {
    const html = renderToString(
      <PictureImage
        src="/products/hld-13.svg"
        alt="هولدر مگنتی"
        priority={true}
      />
    );

    expect(html).not.toContain('<picture');
    expect(html).not.toContain('<source');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('hld-13.svg');
  });
});
