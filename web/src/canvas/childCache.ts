// Resolved children, held (#139 M0). Seam zoom needs a child model DURING a
// gesture, and `resolveModelRefs` is async: re-resolving and re-parsing per
// frame would stutter exactly where the zoom is meant to be continuous. So the
// parsed CanvasModel is kept, keyed by the ref id its parent stamps.
//
// The store's shadowing order (library → working folder → bundled shelf) is not
// re-implemented here — resolution stays `resolveModelRefs`, and this only
// remembers its answer. That is also why the cache must be invalidated when the
// order's inputs move: a child saved this session must not keep rendering the
// shipped copy.
//
// An UNRESOLVED ref is not an error (the kernel's decomposition issue is the
// only complaint a broken seam earns), but it must not be retried every frame
// either, so a miss is remembered as a miss for a short while and then allowed
// to resolve again — a child saved a moment ago should appear without a reload.
import type { CanvasModel } from "../kernel/types";

const CAP = 32;
/** How long a miss stays remembered. Long enough to cover a zoom gesture,
 *  short enough that saving the missing child makes it appear. */
const MISS_TTL_MS = 5000;

type Entry = { model: CanvasModel | null; at: number };

export class ChildCache {
  private entries = new Map<string, Entry>();

  constructor(private now: () => number = Date.now) {}

  /** The parsed child, `null` if it is known not to resolve, `undefined` if
   *  nothing is known — which is the caller's cue to resolve it. */
  get(id: string): CanvasModel | null | undefined {
    const hit = this.entries.get(id);
    if (!hit) return undefined;
    if (hit.model === null && this.now() - hit.at > MISS_TTL_MS) {
      this.entries.delete(id);
      return undefined;
    }
    // Map iteration order is insertion order, so re-inserting is the whole LRU.
    this.entries.delete(id);
    this.entries.set(id, hit);
    return hit.model;
  }

  set(id: string, model: CanvasModel | null): void {
    this.entries.delete(id);
    this.entries.set(id, { model, at: this.now() });
    while (this.entries.size > CAP) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  invalidate(id: string): void {
    this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
