// #324: the drafted partition, and the property the whole design rests on —
// it degrades to ABSENT. The reasoner is off by default (#229), so every way
// of failing to read the ledger has to arrive at the same empty list, or a
// user who never turns the co-author on gets an error in their library.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { draftedModels, draftedName } from "./drafted";

const authoringHistoryMock = vi.hoisted(() => vi.fn());
vi.mock("./gsr", () => ({ authoringHistory: authoringHistoryMock }));

const turn = (over: Record<string, unknown> = {}) => ({
  id: 113,
  description: "A ribosome translating messenger RNA into a polypeptide chain.",
  sl: 'system "Ribosome" : Concrete/Biological\n@lens mobus\n',
  model: "claude-sonnet-5",
  lens: "",
  at: "2026-08-12T23:07:44.277769+00:00",
  ...over,
});

beforeEach(() => authoringHistoryMock.mockReset());

describe("the drafted partition degrades to absent", () => {
  it("is empty when the ledger has nothing to give", async () => {
    authoringHistoryMock.mockResolvedValue([]);
    expect(await draftedModels()).toEqual([]);
  });

  it("does not throw when the reasoner is off or unreachable", async () => {
    // authoringHistory swallows those cases itself and resolves empty; this
    // pins that drafted.ts adds no branch of its own that could reintroduce a
    // throw between the door and the page.
    authoringHistoryMock.mockResolvedValue([]);
    await expect(draftedModels()).resolves.toEqual([]);
  });
});

describe("a turn becomes a row", () => {
  it("names the row by what the author asked for, and reports who answered", async () => {
    authoringHistoryMock.mockResolvedValue([turn()]);
    const [row] = await draftedModels();
    expect(row.description).toBe(
      "A ribosome translating messenger RNA into a polypeptide chain.",
    );
    expect(row.model).toBe("claude-sonnet-5");
    expect(row.key).toBe("drafted:113");
    expect(row.sl).toContain('system "Ribosome"');
  });

  it("drops a turn carrying no SL — a turn without one is not a model", async () => {
    authoringHistoryMock.mockResolvedValue([turn(), turn({ id: 114, sl: "" })]);
    const rows = await draftedModels();
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("drafted:113");
  });

  it("keeps keys unique so two turns on one description are two rows", async () => {
    authoringHistoryMock.mockResolvedValue([turn(), turn({ id: 116 })]);
    const keys = (await draftedModels()).map((r) => r.key);
    expect(new Set(keys).size).toBe(2);
  });
});

describe("the human's verdict (#325)", () => {
  it("carries a recorded verdict through to the row", async () => {
    authoringHistoryMock.mockResolvedValue([turn({ status: "accepted" })]);
    expect((await draftedModels())[0].status).toBe("accepted");
  });

  /// The load-bearing one. Most turns in any ledger older than the feature have
  /// never been ruled on, and rendering that as a rejection would misreport the
  /// whole corpus — which is the exact thing this column exists to be honest about.
  it("reads an absent verdict as UNRULED, never as discarded", async () => {
    authoringHistoryMock.mockResolvedValue([turn(), turn({ id: 2, status: null })]);
    const rows = await draftedModels();
    expect(rows.map((r) => r.status)).toEqual([null, null]);
    expect(rows.some((r) => r.status === "discarded")).toBe(false);
  });

  it("refuses a value the server had no business sending", async () => {
    authoringHistoryMock.mockResolvedValue([turn({ status: "lgtm" })]);
    expect((await draftedModels())[0].status).toBeNull();
  });
});

describe("a description becomes a line", () => {
  it("leaves a short prompt exactly as written", () => {
    expect(draftedName("a coffee shop")).toBe("a coffee shop");
  });

  it("collapses the whitespace a pasted prompt carries", () => {
    expect(draftedName("  a  coffee\n  shop ")).toBe("a coffee shop");
  });

  it("truncates on a word boundary, so the ellipsis reads as a cut", () => {
    const long =
      "A ribosome translating messenger RNA into a polypeptide chain. " +
      "Charged transfer RNAs deliver amino acids, GTP is consumed at each step.";
    const name = draftedName(long);
    expect(name.length).toBeLessThanOrEqual(97);
    expect(name.endsWith("…")).toBe(true);
    expect(name).not.toMatch(/\s…$/);
  });
});
