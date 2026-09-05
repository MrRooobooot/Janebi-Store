// Regression test for the /yes idempotency fix: a retried /yes must NOT
// create the product twice, and the draft must not resurrect after success.
//
// The worker is Cloudflare-coupled (KV + fetch globals, workers-types tsconfig
// without node types), so the source is read with vitest's node environment
// (vitest runs in Node even when the target runtime is workerd).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/worker.ts", import.meta.url).pathname, "utf-8");

describe("bale-worker /yes idempotency contract", () => {
  it("deletes the draft BEFORE calling createProduct", () => {
    const confirmIdx = src.indexOf("case 'confirm':");
    const delIdx = src.indexOf("await env.DRAFTS.delete(key);", confirmIdx);
    const createIdx = src.indexOf("await createProduct(env, {", confirmIdx);
    expect(delIdx).toBeGreaterThan(confirmIdx);
    expect(createIdx).toBeGreaterThan(delIdx);
  });

  it("suppresses the trailing draft re-put after /yes consumption", () => {
    expect(src).toContain("draftsInFlight");
    expect(src).toContain("if (d.step !== 'title' && !draftsInFlight.delete(key))");
  });

  it("keeps the /new draft put and the single guarded trailing put", () => {
    expect(src.match(/await env\.DRAFTS\.put\(/g)?.length).toBe(3); // /new + photo + guarded tail
  });
});
