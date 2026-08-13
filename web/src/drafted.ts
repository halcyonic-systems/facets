// The third provenance: models drafted with the co-author (#324).
//
// The library already partitions by where a model CAME FROM — an example is
// ours, a corpus entry is an author's and carries a citation. A drafted model
// is the user's own ask, answered by a model, and the row says so.
//
// Two things about this partition are unlike the other two, and both follow
// from the same fact — it is read over the network from the reasoner:
//
//   - it is ASYNC, so it cannot join `shippedModels()`, which is sync and
//     derived from globs at build time. The page renders the shipped list
//     immediately and this list when it arrives.
//   - it is OPTIONAL. The reasoner is off by default (#229) and nothing leaves
//     the machine until the user turns it on, so a user who never turns the
//     co-author on must see a library that behaves exactly as it does today.
//     Absent, not empty-with-an-explanation, and never an error.
//
// What this module does NOT do is read the SL. A drafted row is named by the
// description the author typed, because that is a client fact that needs no
// parsing — and parsing SL here would be systems logic in JS, which invariant
// #1 forbids outright. The kernel reads the SL when the row is opened, on the
// same path every other model takes.
import { authoringHistory, type AuthoringTurn } from "./gsr";

/** One drafted model, as the library lists it. Deliberately NOT a
 *  `ShippedModel`: nothing here ships, there is no genus to tag it with and no
 *  citation to withhold, and pretending otherwise would put a fake tradition on
 *  a row whose whole point is that it has none. */
export interface DraftedModel {
  /** The ledger's row id — stable, and unique across turns by construction. */
  key: string;
  /** The description the author typed. This is the row's name: it is what the
   *  person asked for, which is a better handle on a draft than anything the
   *  draft calls itself. */
  description: string;
  /** The model that ANSWERED, never the one that was asked for — the two differ
   *  whenever the reasoner could not reach the requested one, and the ledger
   *  records what actually happened. */
  model: string;
  /** ISO-8601, as the ledger stored it. Formatting is the page's business. */
  at: string;
  /** The SL this turn produced. Opening the row hands this to the kernel. */
  sl: string;
  /** The human's verdict, or null when nobody has ruled (#325). Unruled is the
   *  common case in any ledger older than the feature, so a surface must show
   *  it as "not asked" and never as a rejection. */
  status: "accepted" | "discarded" | null;
}

/** How long a description may run before the row truncates it. A prompt is a
 *  sentence or three; a row is a line. */
const NAME_MAX = 96;

export function draftedName(description: string): string {
  const one = description.replace(/\s+/g, " ").trim();
  if (one.length <= NAME_MAX) return one;
  // Break on a word so the ellipsis reads as a truncation rather than damage.
  const cut = one.slice(0, NAME_MAX);
  const space = cut.lastIndexOf(" ");
  return `${(space > NAME_MAX / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function toRow(turn: AuthoringTurn): DraftedModel | null {
  // A turn with no SL is not a model. The route already drops these, so this is
  // the second gate rather than the first — but the wire is not ours to trust.
  if (!turn?.sl || typeof turn.sl !== "string") return null;
  return {
    key: `drafted:${turn.id}`,
    description: draftedName(String(turn.description ?? "")),
    model: String(turn.model ?? ""),
    at: String(turn.at ?? ""),
    sl: turn.sl,
    status: turn.status === "accepted" || turn.status === "discarded" ? turn.status : null,
  };
}

/** The drafted partition's contents, newest first. Resolves to the empty list
 *  whenever the reasoner is off, unreachable, or shared — see `authoringHistory`,
 *  which is where that decision is made and explained. */
export async function draftedModels(limit = 50): Promise<DraftedModel[]> {
  const turns = await authoringHistory(limit);
  return turns.map(toRow).filter((r): r is DraftedModel => r !== null);
}
