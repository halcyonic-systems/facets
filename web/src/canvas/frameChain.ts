// The breadcrumb, read off the view's frame chain (#139 M3, rule 3). Before
// this the crumbs were a record of clicks; now they are a readout of where the
// view is — one crumb per frame the transform has been rebased through, the
// last of them the frame that is actually editable. The two coincide today,
// which is the point: a crossing is a crossing however the hand made it, so a
// double-click and a wheel produce the same chain.
//
// `continuous` marks a crossing that carries an embed and can therefore be
// zoomed back out of. A frame entered by a plain document swap (the inspector's
// door, a model opened before any aperture existed) has no coordinate relation
// to its parent to invert, so leaving it is a fit rather than a rebase — the
// crumb still works, it just cannot claim the picture will hold still.

export interface FrameLink {
  label: string;
  modelId: string | null;
  /** The frame's decomposition seams as of the crossing (kernel-fed). */
  clean: boolean;
  /** Whether the crossing below this frame was a rebase. */
  continuous: boolean;
}

export interface FrameCrumb extends FrameLink {
  /** Position in the chain; 0 is the outermost frame. */
  depth: number;
  /** The frame the view is rebased onto — editable, and no exit target. */
  focused: boolean;
}

/** One crumb per frame, ancestors first, the focused frame last. */
export function frameChain(ancestors: readonly FrameLink[], focused: FrameLink): FrameCrumb[] {
  return [
    ...ancestors.map((f, depth) => ({ ...f, depth, focused: false })),
    { ...focused, depth: ancestors.length, focused: true },
  ];
}
