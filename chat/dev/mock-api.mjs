// Development stand-in for the GSR routes the chat client talks to, so the real
// page can be driven before the server side of gsr#47/#48/#49 is reachable.
// In-memory only; any Bearer token is accepted and maps to one subject.
//
//   node chat/dev/mock-api.mjs        # listens on :5010
//
// POST /__mock/expire toggles 401 on every authenticated route, which is how the
// expired-session read-only state gets exercised.

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT || 5010);
let rejectAll = false;

const me = { id: 'mock-subject', display_name: null, is_anonymous: true, created_at: new Date().toISOString() };
const conversations = new Map();
const shares = new Map();

function seed(title, pairs) {
  const id = randomUUID();
  const now = Date.now();
  const messages = [];
  pairs.forEach(([q, a], i) => {
    messages.push({ id: randomUUID(), role: 'user', content: q, seq: messages.length, created_at: new Date(now - (pairs.length - i) * 60000).toISOString(), model_meta: null });
    messages.push({ id: randomUUID(), role: 'bot', content: a, seq: messages.length, created_at: new Date(now - (pairs.length - i) * 59000).toISOString(), model_meta: { route: 'integrated', dimensions: [], sources: [] } });
  });
  conversations.set(id, { id, title, created_at: new Date(now - 86400000).toISOString(), updated_at: new Date(now).toISOString(), deleted_at: null, messages });
  return id;
}

seed('How does a coral reef maintain itself?', [[
  'How does a coral reef maintain itself as a system?',
  '## TL;DR\nA reef holds itself together through tight nutrient recycling.\n\n## Full Analysis\nThe polyp-algae symbiosis closes the loop that open water cannot.',
]]);
seed('Why do large organizations become slow?', [[
  'Why do large organizations become slow?',
  'Coordination cost grows faster than the number of parts.',
]]);

function send(res, code, body, extra) {
  const headers = Object.assign({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  }, extra || {});
  res.writeHead(code, headers);
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function sseHead(res) {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
}
function sse(res, event, payload) {
  res.write('event: ' + event + '\ndata: ' + JSON.stringify(payload) + '\n\n');
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); } });
  });
}

function summary(c) {
  return {
    id: c.id, title: c.title, created_at: c.created_at, updated_at: c.updated_at,
    message_count: c.messages.length,
  };
}

const ANSWER = '## TL;DR\nThe mock engine answers so the client can be driven end to end.\n\n'
  + '## Full Analysis\nEvery field the renderer reads is present, with nothing behind it.';

async function answerStream(req, res, integrated) {
  const body = await readBody(req);
  const convId = body.conversation_id && conversations.has(body.conversation_id)
    ? body.conversation_id : randomUUID();
  let c = conversations.get(convId);
  if (!c) {
    c = { id: convId, title: (body.question || 'Untitled').slice(0, 40), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, messages: [] };
    conversations.set(convId, c);
  }
  const userId = body.message_id || randomUUID();
  if (!c.messages.some((m) => m.id === userId)) {
    c.messages.push({ id: userId, role: 'user', content: body.question || '', seq: c.messages.length, created_at: new Date().toISOString(), model_meta: null });
  }
  const botId = randomUUID();
  const shareId = 'mock' + Math.random().toString(36).slice(2, 8);

  sseHead(res);
  sse(res, 'status', integrated ? { stage: 'lens_ready', lens: { mode: 'mobus' } } : { stage: 'classifying' });
  await new Promise((r) => setTimeout(r, 120));
  sse(res, 'status', integrated ? { stage: 'synthesizing' } : { stage: 'retrieving', dimensions: ['C', 'N'], intensity: 'light' });
  await new Promise((r) => setTimeout(r, 120));
  for (const chunk of ANSWER.match(/[\s\S]{1,40}/g)) {
    sse(res, 'token', { text: chunk });
    await new Promise((r) => setTimeout(r, 15));
  }
  c.messages.push({ id: botId, role: 'bot', content: ANSWER, seq: c.messages.length, created_at: new Date().toISOString(), model_meta: null });
  c.updated_at = new Date().toISOString();
  shares.set(shareId, { question: body.question || '', payload: { answer: ANSWER, route: 'integrated', dimensions: ['C', 'N'], sources: [{ type: 'vector', source: 'Mobus 2015', excerpt: 'mock excerpt', score: '0.81' }] } });
  sse(res, 'done', {
    answer: ANSWER,
    route: integrated ? 'integrated' : 'vector',
    confidence: '0.8',
    dimensions: integrated ? [] : ['C', 'N'],
    intensity: 'light',
    sources: [{ type: 'vector', source: 'Mobus 2015', excerpt: 'mock excerpt', score: '0.81' }],
    lenses: integrated ? [{ mode: 'mobus', dimensions: ['C', 'N'], snippet: 'A reef is a structure of polyps' }] : [],
    answer_id: shareId,
    conversation_id: convId,
    message_id: userId,
    bot_message_id: botId,
  });
  res.end();
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  if (req.method === 'OPTIONS') return send(res, 204);

  if (path === '/__mock/expire') { rejectAll = !rejectAll; return send(res, 200, { rejecting: rejectAll }); }
  if (path === '/status') return send(res, 200, { ready: true, model: 'mock-engine', mode: 'local', web_search: false });

  const authed = Boolean(req.headers.authorization);
  const guarded = path.startsWith('/v1/') || path.startsWith('/ask') || path === '/extract';
  if (guarded && (rejectAll || !authed)) return send(res, 401, { detail: 'not authenticated' });

  if (path === '/log-event') { await readBody(req); return send(res, 204); }
  if (path === '/v1/auth/claim-legacy') { const b = await readBody(req); return send(res, 200, { claimed: true, legacy_user_id: b.legacy_user_id }); }

  if (path === '/ask-integrated') return answerStream(req, res, true);
  if (path === '/ask-stream') return answerStream(req, res, false);
  if (path === '/ask') { await readBody(req); return send(res, 200, { answer: ANSWER, route: 'vector', confidence: '0.8', dimensions: ['C'], sources: [] }); }
  if (path === '/ask-all') { await readBody(req); return send(res, 200, { lenses: [{ mode: 'mobus', answer: 'mock', dimensions: ['C'] }], convergence: { text: 'mock convergence' } }); }

  if (path.startsWith('/a/')) {
    const s = shares.get(path.slice(3));
    return s ? send(res, 200, s) : send(res, 404, { detail: 'not found' });
  }

  if (path === '/v1/conversations' && req.method === 'GET') {
    const limit = Number(url.searchParams.get('limit') || 25);
    const live = [...conversations.values()].filter((c) => !c.deleted_at)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const start = Number(url.searchParams.get('cursor') || 0);
    const page = live.slice(start, start + limit);
    return send(res, 200, {
      conversations: page.map(summary),
      next_cursor: start + limit < live.length ? String(start + limit) : null,
    });
  }

  const one = path.match(/^\/v1\/conversations\/([^/]+)$/);
  if (one) {
    const c = conversations.get(one[1]);
    if (!c || c.deleted_at) return send(res, 404, { detail: 'not found' });
    if (req.method === 'GET') return send(res, 200, Object.assign(summary(c), { messages: c.messages }));
    if (req.method === 'DELETE') { c.deleted_at = new Date().toISOString(); return send(res, 204); }
    if (req.method === 'PATCH') { const b = await readBody(req); if (b.title) c.title = b.title; return send(res, 200, summary(c)); }
  }

  if (path === '/v1/me') {
    if (req.method === 'GET') return send(res, 200, me);
    if (req.method === 'PATCH') { const b = await readBody(req); me.display_name = b.display_name || null; return send(res, 200, me); }
    if (req.method === 'DELETE') {
      const revoke = url.searchParams.get('revoke_shares') === '1';
      conversations.clear();
      if (revoke) shares.clear();
      me.display_name = null;
      return send(res, 200, { deleted: true, shares_revoked: revoke });
    }
  }

  if (path === '/v1/me/export') {
    return send(res, 200, {
      account: me,
      conversations: [...conversations.values()].filter((c) => !c.deleted_at),
      shares: [...shares.keys()].map((id) => ({ id })),
    });
  }

  if (path === '/extract') { await readBody(req); return send(res, 404, { detail: 'no extract in mock' }); }
  return send(res, 404, { detail: 'unknown route' });
}).listen(PORT, () => console.log('mock GSR on http://localhost:' + PORT));
