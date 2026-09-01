import { describe, it, expect } from "vitest";
import { escapeLikePattern, containsLikePattern } from "../../server/utils/like";
import Database from "better-sqlite3";

describe("LIKE pattern escaping (audit §3.14)", () => {
  it("escapes backslash, percent, and underscore", () => {
    expect(escapeLikePattern("a%b_c\\d")).toBe("a\\%b\\_c\\\\d");
  });

  it("leaves normal text untouched", () => {
    expect(escapeLikePattern("گوشی سامسونگ s24")).toBe("گوشی سامسونگ s24");
  });

  it("wraps term in wildcards while escaping", () => {
    expect(containsLikePattern("50%_off")).toBe("%50\\%\\_off%");
  });

  it("matches % and _ literally against a real SQLite LIKE", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (name TEXT)");
    db.prepare("INSERT INTO t (name) VALUES ('50%_off'), ('50Xoff'), ('plain')").run();
    const rows = db
      .prepare("SELECT name FROM t WHERE name like ? escape '\\'")
      .all(containsLikePattern("50%_off")) as { name: string }[];
    expect(rows).toEqual([{ name: "50%_off" }]);
  });
});
