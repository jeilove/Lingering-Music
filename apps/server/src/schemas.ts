import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// --- 공통 스키마 ---

const TrackSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().nullable().optional().default('Unknown Album'),
  duration: z.number().nonnegative().nullable().optional().default(0),
  coverUrl: z.string().nullable().optional(),
  releaseYear: z.union([z.number(), z.string()]).nullable().optional(),
  tags: z.array(z.string()).optional(),
  url: z.string().nullable().optional(),
  source: z.string().optional(),
  excludeFromRecs: z.boolean().optional(),
}).passthrough();

const FavoriteGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tracks: z.array(TrackSchema),
});

const PlayHistorySchema = z.object({
  trackId: z.string().min(1),
  playedAt: z.number(),
});

// --- 엔드포인트별 스키마 ---

export const Schemas = {
  // POST /api/storage/migrate
  migrateBatch: z.object({
    tracks: z.array(TrackSchema).default([]),
    history: z.array(PlayHistorySchema).default([]),
    favorites: z.array(FavoriteGroupSchema).default([]),
  }),

  // POST /api/storage/tracks
  saveTrack: TrackSchema,

  // GET /api/storage/tracks-by-tag
  tracksByTagQuery: z.object({
    tag: z.string().min(1, 'tag 파라미터가 필요합니다'),
  }),

  // POST /api/storage/favorites
  saveFavoriteGroup: FavoriteGroupSchema,

  // GET /api/storage/history
  historyQuery: z.object({
    limit: z.preprocess((val) => (val === '' || val === undefined ? undefined : val), z.coerce.number().int().positive().max(1000).default(200)),
  }).passthrough(),

  // POST /api/storage/history
  addHistory: z.object({
    trackId: z.string().min(1),
    track: TrackSchema.optional(),
  }).passthrough(),

  // GET /api/storage/recent
  recentQuery: z.object({
    limit: z.preprocess((val) => (val === '' || val === undefined ? undefined : val), z.coerce.number().int().positive().max(200).default(30)),
  }).passthrough(),

  // GET /api/stream-url
  streamUrlQuery: z.object({
    title: z.string().min(1, 'title 파라미터가 필요합니다'),
    artist: z.string().min(1, 'artist 파라미터가 필요합니다'),
    id: z.string().optional(),
  }).passthrough(),

  // GET /api/download
  downloadQuery: z.object({
    title: z.string().min(1, 'title 파라미터가 필요합니다'),
    artist: z.string().min(1, 'artist 파라미터가 필요합니다'),
  }),

  // GET /api/search, GET /api/yt-search
  searchQuery: z.object({
    q: z.string().min(1, 'q 파라미터가 필요합니다').max(200),
  }),

  // GET /api/lyrics
  lyricsQuery: z.object({
    title: z.string().min(1, 'title 파라미터가 필요합니다'),
    artist: z.string().min(1, 'artist 파라미터가 필요합니다'),
    album: z.string().optional(),
    duration: z.coerce.number().nonnegative().optional(),
  }),
};

// --- 검증 미들웨어 헬퍼 ---

export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: '잘못된 요청 데이터',
        details: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: '잘못된 쿼리 파라미터',
        details: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
    }
    // 파싱된 값(coerce 적용)으로 교체
    req.query = result.data as any;
    next();
  };
}
