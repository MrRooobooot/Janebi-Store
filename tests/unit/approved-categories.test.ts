import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { APPROVED_CATEGORIES } from '../../src/lib/approvedCategories';

// docs/reference/CATEGORY-TREE.md is the locked source of truth. This test keeps the code list
// (src/lib/approvedCategories.ts, used by the admin product form) identical to it.
const treeDoc = readFileSync(new URL('../../docs/reference/CATEGORY-TREE.md', import.meta.url), 'utf8');

describe('approved categories', () => {
  it('match the numbered list in CATEGORY-TREE.md exactly, in order', () => {
    const section = treeDoc.split('## ۱۴ دستهٔ اصلی تأییدشده')[1]?.split('\n## ')[0] ?? '';
    const fromDoc = [...section.matchAll(/^\d+\.\s+(.+)$/gm)].map((m) => m[1].trim());

    expect(fromDoc).toHaveLength(14);
    expect([...APPROVED_CATEGORIES]).toEqual(fromDoc);
  });

  it('has no duplicate names', () => {
    expect(new Set(APPROVED_CATEGORIES).size).toBe(APPROVED_CATEGORIES.length);
  });
});
