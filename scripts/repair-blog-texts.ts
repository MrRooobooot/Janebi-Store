/**
 * Blog text repair (2026-09-01, r37): 5 live posts carry corrupted/garbled
 * paragraphs (mangled Persian from an earlier seed edit). This script UPDATES
 * only body + excerpt of the affected posts from the canonical corrected seed
 * — titles, images, tags and admin edits to other fields are untouched.
 *
 * Run: SEED_BLOG_SKIP=1 npx tsx scripts/repair-blog-texts.ts
 */
import { db } from '../server/db/index.js';
import { blogPosts } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import { POSTS } from './seed-blog.js';

const AFFECTED = [
  'asrar-sharzh-salem-battery',
  'rahnamaye-kharid-powerbank-mahram',
  'rahnamaye-shishe-gherat-safhe',
  'rahnamaye-gols-doorbin-mohafez-lanz',
  'rahnamaye-entekhab-paye-negahdarande-khodro',
  'rahnamaye-kharid-kabel-sharzh',
  'rahnamaye-sharzh-fandaki-khodro',
];

async function main() {
  let updated = 0;
  for (const id of AFFECTED) {
    const post = POSTS.find((p) => p.id === id);
    if (!post || !post.body) {
      console.error(`  ❌ not found in seed: ${id}`);
      continue;
    }
    const res = await db
      .update(blogPosts)
      .set({ body: post.body, excerpt: post.excerpt })
      .where(eq(blogPosts.id, id))
      .returning({ id: blogPosts.id });
    if (res.length > 0) {
      updated += 1;
      console.log(`  ✅ repaired: ${id}`);
    } else {
      console.error(`  ⚠️ not in DB: ${id}`);
    }
  }
  console.log(`Done. ${updated}/${AFFECTED.length} post(s) repaired.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Blog repair failed:', err);
  process.exit(1);
});
