import { Router, type Router as ExpressRouter } from 'express';
import { localDB } from '../localDB';
import { Schemas, validateBody, validateQuery } from '../schemas';

const router: ExpressRouter = Router();

// Health
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// --- Storage API ---

// Batch Migration
router.post('/storage/migrate', validateBody(Schemas.migrateBatch), (req, res) => {
  try {
    const { tracks, history, favorites } = req.body;
    localDB.bulkSave(tracks, history, favorites);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage POST /migrate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Tracks
router.get('/storage/tracks/:id', (req, res) => {
  try {
    res.json(localDB.getTrack(req.params.id));
  } catch (err: any) {
    console.error('Storage GET /tracks/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/storage/tracks', validateBody(Schemas.saveTrack), (req, res) => {
  try {
    localDB.saveTrack(req.body);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage POST /tracks error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/tags', (_req, res) => {
  try {
    res.json(localDB.getAllTags());
  } catch (err: any) {
    console.error('Storage GET /tags error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/tracks-by-tag', validateQuery(Schemas.tracksByTagQuery), (req, res) => {
  try {
    const tag = req.query.tag as string;
    res.json(localDB.getTracksByTag(tag));
  } catch (err: any) {
    console.error('Storage GET /tracks-by-tag error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Favorites
router.get('/storage/favorites', (_req, res) => {
  try {
    res.json(localDB.getFavoriteGroups());
  } catch (err: any) {
    console.error('Storage GET /favorites error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/storage/favorites', validateBody(Schemas.saveFavoriteGroup), (req, res) => {
  try {
    localDB.saveFavoriteGroup(req.body);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage POST /favorites error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/storage/favorites/:id', (req, res) => {
  try {
    localDB.deleteFavoriteGroup(req.params.id);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage DELETE /favorites/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// History
router.get('/storage/history', validateQuery(Schemas.historyQuery), (req, res) => {
  try {
    const limit = req.query.limit as unknown as number;
    res.json(localDB.getHistory(limit));
  } catch (err: any) {
    console.error('Storage GET /history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/storage/history', validateBody(Schemas.addHistory), (req, res) => {
  try {
    const { trackId, track } = req.body;
    localDB.addHistory(trackId, track);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage POST /history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/storage/history/:trackId', (req, res) => {
  try {
    localDB.removeFromHistory(req.params.trackId);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Storage DELETE /history/:trackId error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/recommendations', (_req, res) => {
  try {
    res.json(localDB.getRecommendations());
  } catch (err: any) {
    console.error('Storage GET /recommendations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/recent', validateQuery(Schemas.recentQuery), (req, res) => {
  try {
    const limit = req.query.limit as unknown as number;
    res.json(localDB.getRecentTracks(limit));
  } catch (err: any) {
    console.error('Storage GET /recent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
