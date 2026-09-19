// #412: a walk file is several flat paragraphs joined by reference; the
// importer stamps identity on the way in and strips it on the way out.
import { describe, expect, it } from "vitest";
import { isWalk, joinWalk, splitWalk, stampWalk } from "./walk";

const WALK = `# Venice, three levels in one file
system "Venice" : Concrete/Technical
component "Venice" interface decomposes "Venice"
source Users
flow Users -> "Venice" : informational "prompts"

system "Venice" : Concrete/Technical
component "Token contracts" interface decomposes "Token contracts"
source Users
flow Users -> "Token contracts" : informational "stake"

system "Token contracts" : Concrete/Technical
component "VVV token" interface
source Users
flow Users -> "VVV token" : informational "stake"
`;

const mint = () => {
  let n = 0;
  return () => `id${++n}`;
};

describe("#412 a walk in one file", () => {
  it("one paragraph is not a walk; two are", () => {
    expect(isWalk('system "A"\ncomponent X\n')).toBe(false);
    expect(isWalk(WALK)).toBe(true);
  });

  it("splits on unindented system lines and keeps the file comment with the first", () => {
    const s = splitWalk(WALK);
    expect(s.paragraphs.map((p) => p.name)).toEqual(["Venice", "Venice", "Token contracts"]);
    expect(s.paragraphs[0].text.startsWith("# Venice, three levels")).toBe(true);
    expect(s.paragraphs[2].text.endsWith('informational "stake"\n')).toBe(true);
  });

  it("a child named for its parent's component resolves to the next paragraph, never to the referrer", () => {
    // The seam contract makes the child's system name equal the decomposing
    // component's name, so level 0 ("Venice") decomposes "Venice" into a
    // paragraph also called "Venice". By name alone that is itself.
    const s = splitWalk(WALK);
    expect(s.root).toBe(0);
    expect(s.unstamped).toEqual([
      { from: 0, label: "Venice", to: 1 },
      { from: 1, label: "Token contracts", to: 2 },
    ]);
    const w = stampWalk(s, mint());
    expect(w.paragraphs[0].text).toContain('decomposes "Venice" @id1');
    expect(w.paragraphs[1].text).toContain('decomposes "Token contracts" @id2');
    expect(w.orphans).toEqual([]);
  });

  it("stamps every bare reference with a minted id and leaves stamped ones alone", () => {
    const s = splitWalk(`system "P"\ncomponent A decomposes "A"\ncomponent B decomposes "B" @Hrs6K91KnZZsiPcWzftv8U\n\nsystem "A"\ncomponent X\n\nsystem "B"\ncomponent Y\n`);
    const w = stampWalk(s, mint());
    expect(w.paragraphs[0].text).toContain('decomposes "A" @id1');
    expect(w.paragraphs[0].text).toContain('decomposes "B" @Hrs6K91KnZZsiPcWzftv8U');
    expect(w.ids.get(1)).toBe("id1");
    expect(w.root).toBe(0);
    expect(w.unresolved).toEqual([]);
    expect(w.orphans).toEqual([]);
  });

  it("reports a reference to a paragraph that is not in the file, and a paragraph nothing reaches", () => {
    const s = splitWalk(`system "P"\ncomponent A decomposes "Missing"\n\nsystem "Loose"\ncomponent Z\n`);
    const w = stampWalk(s, mint());
    expect(w.unresolved).toEqual([{ from: "P", label: "Missing" }]);
    expect(w.orphans).toEqual(["Loose"]);
  });

  it("joins levels back into one copy-safe file with the ids stripped", () => {
    const out = joinWalk([
      'system "P"\ncomponent A decomposes "A" @Hrs6K91KnZZsiPcWzftv8U\n',
      'system "A"\ncomponent X\n',
    ]);
    expect(out).toBe('system "P"\ncomponent A decomposes "A"\n\nsystem "A"\ncomponent X\n');
    expect(isWalk(out)).toBe(true);
  });
});
