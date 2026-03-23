import express from 'express';
import Session from '../models/Session.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

function computeStats({ startedAt, endedAt, events, content }) {
  const started = startedAt instanceof Date ? startedAt.getTime() : new Date(startedAt).getTime();
  const ended = endedAt ? (endedAt instanceof Date ? endedAt.getTime() : new Date(endedAt).getTime()) : Date.now();
  const durationMs = Math.max(0, ended - started);

  const sorted = [...(events || [])].sort((a, b) => (a.t || 0) - (b.t || 0));
  const intervals = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const dt = (sorted[i].t || 0) - (sorted[i - 1].t || 0);
    if (dt >= 0 && dt < 60_000) intervals.push(dt);
  }

  const keydowns = (events || []).filter((e) => e.type === 'keydown');
  const backspaces = keydowns.filter((e) => e.keyType === 'BACKSPACE').length;
  const pasteEvents = (events || []).filter((e) => e.type === 'paste');
  const pastedChars = pasteEvents.reduce((sum, e) => sum + (e.meta?.len || 0), 0);

  const totalChars = (content || '').length;
  const cpm = durationMs > 0 ? Math.round((totalChars / durationMs) * 60_000) : 0;

  const bigPauses = intervals.filter((ms) => ms >= 2000).length;
  const variance = intervals.length
    ? Math.round(
        intervals.reduce((acc, v) => acc + Math.pow(v - intervals.reduce((a, b) => a + b, 0) / intervals.length, 2), 0) /
          intervals.length
      )
    : 0;

  const suspicious = [];
  if (pastedChars >= 200) suspicious.push('large_paste');
  if (pasteEvents.length >= 3) suspicious.push('multiple_pastes');
  if (durationMs > 0 && totalChars > 0 && cpm >= 1200) suspicious.push('very_high_speed');

  return {
    durationMs,
    totalChars,
    charsPerMinute: cpm,
    events: {
      total: (events || []).length,
      keydowns: keydowns.length,
      backspaces,
      pastes: pasteEvents.length,
      pastedChars,
      bigPauses,
      intervalVariance: variance,
    },
    suspicious,
  };
}

router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const { title } = req.body || {};
    const session = await Session.create({
      userId: req.user.userId,
      title: title ? String(title).trim() : '',
      content: '',
      startedAt: new Date(),
      events: [],
    });

    return res.status(201).json({ sessionId: session._id.toString() });
  } catch {
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select({ title: 1, startedAt: 1, endedAt: 1, createdAt: 1, updatedAt: 1 });

    return res.json({
      sessions: sessions.map((s) => ({
        id: s._id.toString(),
        title: s.title,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch {
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId }).select({
      title: 1,
      content: 1,
      startedAt: 1,
      endedAt: 1,
      stats: 1,
      createdAt: 1,
      updatedAt: 1,
    });

    if (!session) return res.status(404).json({ error: 'not_found' });

    return res.json({
      session: {
        id: session._id.toString(),
        title: session.title,
        content: session.content,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        stats: session.stats,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch {
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/:id/events', async (req, res) => {
  try {
    const { events } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }

    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!session) return res.status(404).json({ error: 'not_found' });

    const cleaned = events
      .slice(0, 2000)
      .map((e) => ({
        t: Number(e.t),
        type: String(e.type || 'unknown'),
        key: e.key ? String(e.key) : undefined,
        keyType: e.keyType ? String(e.keyType) : undefined,
        meta: e.meta && typeof e.meta === 'object' ? e.meta : undefined,
      }))
      .filter((e) => Number.isFinite(e.t) && e.t >= 0 && e.t < Date.now() + 60_000);

    session.events.push(...cleaned);

    const hardLimit = 50_000;
    if (session.events.length > hardLimit) {
      session.events = session.events.slice(session.events.length - hardLimit);
    }

    await session.save();

    return res.json({ ok: true, ingested: cleaned.length });
  } catch {
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { title, content, endedAt } = req.body || {};
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!session) return res.status(404).json({ error: 'not_found' });

    if (typeof title === 'string') session.title = title.trim();
    if (typeof content === 'string') session.content = content;
    if (endedAt) session.endedAt = new Date(endedAt);

    const stats = computeStats({
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      events: session.events,
      content: session.content,
    });
    session.stats = stats;

    await session.save();

    return res.json({
      session: {
        id: session._id.toString(),
        title: session.title,
        content: session.content,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        stats: session.stats,
      },
    });
  } catch {
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/:id/report', async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId }).select({
      title: 1,
      startedAt: 1,
      endedAt: 1,
      content: 1,
      events: 1,
      stats: 1,
    });

    if (!session) return res.status(404).json({ error: 'not_found' });

    const stats = session.stats || computeStats({
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      events: session.events,
      content: session.content,
    });

    const report = {
      sessionId: session._id.toString(),
      title: session.title,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      summary: {
        durationMs: stats.durationMs,
        totalChars: stats.totalChars,
        charsPerMinute: stats.charsPerMinute,
      },
      signals: stats.events,
      suspicious: stats.suspicious,
      note: 'Heuristic report only (no AI/ML).',
    };

    return res.json({ report });
  } catch {
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
