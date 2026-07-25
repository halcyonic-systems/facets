# ── Transformer Block, Mobus lens ────────────────────────────────────
# A transformer is a flow network with known ground truth: the residual
# stream is the conserved substance every block reads from and writes
# back to, so it is modeled here as its own Buffering stock rather than
# folded into the point-to-point wiring. Token Embedding writes the
# stream's first value; Attention and the Feed-Forward network each
# read the current stream and add their own contribution back onto it
# (the residual add); Unembedding reads the final stream and projects
# it out as next-token logits. Only Token Embedding and Unembedding
# touch the boundary — Attention and the Feed-Forward network are
# purely internal work processes on the stream.

system "Transformer Block" : Concrete/Technical
domain "One decoder-only transformer block: attention and a per-position feed-forward network operating on a shared residual stream"

# ── Composition ───────────────────────────────────────────────────────
# Token Embedding is the boundary transducer: it reads discrete token
# ids from outside and produces the residual stream's initial value.
component "Token Embedding" primitive Sensing interface

# The residual stream itself: a stock that accumulates every block's
# contribution across the forward pass. Nothing here computes anything
# — it is what gets read and added to.
component "Residual Stream" primitive Buffering

# Attention mixes information ACROSS positions — the one component in
# the block whose output at a given position depends on every other
# position's residual value. That cross-position combination is the
# Combining work process.
component Attention primitive Combining

# The feed-forward network applies a per-position, position-independent
# transform to whatever the stream carries at that position — it
# modulates the signal already there rather than mixing across
# positions the way Attention does.
component "Feed-Forward" primitive Modulating

# Unembedding is the mirror boundary transducer to Token Embedding: it
# reads the finished stream and projects it into a distribution over
# the vocabulary, one flow crossing back out.
component Unembedding primitive Splitting interface

# ── Environment ────────────────────────────────────────────────────────
environment "Input Tokens"
environment "Output Logits"

# ── Structure ─────────────────────────────────────────────────────────
flow "Input Tokens" -> "Token Embedding" : informational "token ids"
flow "Token Embedding" -> "Residual Stream" : informational "embedded residual (initial write)"

# Attention's read/write pair IS the residual add: it reads the stream
# as it stands, computes its cross-position mixture, and writes that
# contribution back rather than replacing the stream outright.
flow "Residual Stream" -> Attention : informational "residual read (pre-attention)"
flow Attention -> "Residual Stream" : informational "attention output (residual add)"

# Same read/write pair for the feed-forward network, one step later in
# the stream's history.
flow "Residual Stream" -> "Feed-Forward" : informational "residual read (pre-FFN)"
flow "Feed-Forward" -> "Residual Stream" : informational "FFN output (residual add)"

flow "Residual Stream" -> Unembedding : informational "residual read (final)"
flow Unembedding -> "Output Logits" : informational "next-token logits"

@lens mobus
