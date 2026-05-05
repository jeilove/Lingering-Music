import { Router, type Router as ExpressRouter, Request, Response } from 'express';
import { localDB } from '../localDB';
import { Schemas, validateBody, validateQuery } from '../schemas';

const router: ExpressRouter = Router();

// Middleware to get userId from header
const getUserId = (req: Request) => {
  const userId = req.headers['x-user-id'] as string;
  return userId || 'anonymous'; // Fallback to anonymous for unauthenticated or local usage
};

// Health
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Debug Stats (Check total DB counts)
router.get('/storage/debug-stats', async (_req, res) => {
  try {
    const stats = await localDB.getGlobalStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Storage API ---

// Batch Migration
router.post('/storage/migrate', validateBody(Schemas.migrateBatch), async (req, res) => {
  try {
    const userId = getUserId(req);
    const { tracks, history, favorites } = req.body;
    console.log(`[Migration] User ${userId} is migrating ${tracks.length} tracks, ${history.length} history items, and ${favorites.length} groups`);
    await localDB.bulkSave(userId, tracks, history, favorites);
    console.log(`[Migration] User ${userId} migration successful`);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage POST /migrate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Tracks
router.get('/storage/tracks/:id', async (req, res) => {
  try {
    const track = await localDB.getTrack(req.params.id);
    res.json(track);
  } catch (err: any) {
    console.error('Storage GET /tracks/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/storage/tracks', validateBody(Schemas.saveTrack), async (req, res) => {
  try {
    await localDB.saveTrack(req.body);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage POST /tracks error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/tags', async (_req, res) => {
  try {
    const tags = await localDB.getAllTags();
    res.json(tags);
  } catch (err: any) {
    console.error('Storage GET /tags error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/tracks-by-tag', validateQuery(Schemas.tracksByTagQuery), async (req, res) => {
  try {
    const tag = req.query.tag as string;
    const tracks = await localDB.getTracksByTag(tag);
    res.json(tracks);
  } catch (err: any) {
    console.error('Storage GET /tracks-by-tag error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Favorites
router.get('/storage/favorites', async (req, res) => {
  try {
    const userId = getUserId(req);
    const favorites = await localDB.getFavoriteGroups(userId);
    res.json(favorites);
  } catch (err: any) {
    console.error('Storage GET /favorites error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/storage/favorites', validateBody(Schemas.saveFavoriteGroup), async (req, res) => {
  try {
    const userId = getUserId(req);
    await localDB.saveFavoriteGroup(userId, req.body);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage POST /favorites error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/storage/favorites/:id', async (req, res) => {
  try {
    await localDB.deleteFavoriteGroup(req.params.id);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage DELETE /favorites/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// History
router.get('/storage/history', validateQuery(Schemas.historyQuery), async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 200;
    const history = await localDB.getHistory(userId, limit);
    res.json(history);
  } catch (err: any) {
    console.error('Storage GET /history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/storage/history', validateBody(Schemas.addHistory), async (req, res) => {
  try {
    const userId = getUserId(req);
    const { trackId, track } = req.body;
    await localDB.addHistory(userId, trackId, track);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage POST /history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/storage/history/:trackId', async (req, res) => {
  try {
    const userId = getUserId(req);
    await localDB.removeFromHistory(userId, req.params.trackId);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage DELETE /history/:trackId error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/recommendations', async (req, res) => {
  try {
    const userId = getUserId(req);
    const recs = await localDB.getRecommendations(userId);
    res.json(recs);
  } catch (err: any) {
    console.error('Storage GET /recommendations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/recent', validateQuery(Schemas.recentQuery), async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 30;
    const tracks = await localDB.getRecentTracks(userId, limit);
    res.json(tracks);
  } catch (err: any) {
    console.error('Storage GET /recent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
