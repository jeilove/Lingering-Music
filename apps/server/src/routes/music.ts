import { Router, type Router as ExpressRouter } from 'express';
import axios from 'axios';
import { execFile, spawn } from 'child_process';
import type { Track } from '@music-player/shared';
import fs from 'fs';
import path from 'path';
import { cache } from '../cache';
import { config } from '../config';
import { Schemas, validateQuery } from '../schemas';

const router: ExpressRouter = Router();

// ============================================
// Piped/Invidious API 인스턴스 (실시간 확인된 살아있는 것들만)
// ============================================
const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://inv.nadeko.net',
];

// Piped API 요청 헬퍼
async function pipedFetch(endpoint: string): Promise<any> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const url = `${instance}${endpoint}`;
      console.log(`[Piped] Trying: ${url}`);
      const res = await axios.get(url, { timeout: 10000 });
      return res.data;
    } catch (err: any) {
      console.warn(`[Piped] ${instance} failed: ${err.message}`);
    }
  }
  return null; // null이면 Invidious로 폴백
}

// Invidious API 요청 헬퍼
async function invidiousFetch(endpoint: string): Promise<any> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1${endpoint}`;
      console.log(`[Invidious] Trying: ${url}`);
      const res = await axios.get(url, { timeout: 10000 });
      return res.data;
    } catch (err: any) {
      console.warn(`[Invidious] ${instance} failed: ${err.message}`);
    }
  }
  return null;
}

// 오디오 스트림 URL 추출 (Piped 우선 → Invidious 폴백)
async function getAudioUrlFromPiped(videoId: string): Promise<string> {
  const cacheKey = `piped:audio:${videoId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[Audio] Cache hit: ${videoId}`);
    return cached as string;
  }

  // 1차: Piped API 시도
  const pipedData = await pipedFetch(`/streams/${videoId}`);
  if (pipedData && pipedData.audioStreams && pipedData.audioStreams.length > 0) {
    const bestAudio = pipedData.audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    console.log(`[Piped] Audio found: ${bestAudio.quality || bestAudio.bitrate}kbps`);
    cache.set(cacheKey, bestAudio.url, 300);
    return bestAudio.url;
  }

  // 2차: Invidious API 시도
  console.log(`[Audio] Piped failed, trying Invidious for: ${videoId}`);
  const invData = await invidiousFetch(`/videos/${videoId}`);
  if (invData && invData.adaptiveFormats) {
    const audioFormats = invData.adaptiveFormats.filter((f: any) => f.type?.startsWith('audio/'));
    if (audioFormats.length > 0) {
      const bestAudio = audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      console.log(`[Invidious] Audio found: ${bestAudio.bitrate}bps`);
      cache.set(cacheKey, bestAudio.url, 300);
      return bestAudio.url;
    }
  }

  throw new Error(`No audio streams found for video: ${videoId}`);
}

// Piped/Invidious로 유튜브 검색 → videoId 찾기
async function searchYouTubeViaPiped(query: string): Promise<string | null> {
  // 1차: Piped 검색
  try {
    const data = await pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
    if (data && data.items && data.items.length > 0) {
      const url = data.items[0].url || '';
      const videoId = url.replace('/watch?v=', '');
      if (videoId) return videoId;
    }
    // music_songs 필터 실패 시 일반 검색
    const fallback = await pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=videos`);
    if (fallback && fallback.items && fallback.items.length > 0) {
      const url = fallback.items[0].url || '';
      return url.replace('/watch?v=', '') || null;
    }
  } catch (err: any) {
    console.warn(`[Piped Search] Failed: ${err.message}`);
  }

  // 2차: Invidious 검색
  try {
    console.log(`[Search] Piped search failed, trying Invidious...`);
    const data = await invidiousFetch(`/search?q=${encodeURIComponent(query)}&type=video`);
    if (data && data.length > 0) {
      return data[0].videoId || null;
    }
  } catch (err: any) {
    console.warn(`[Invidious Search] Failed: ${err.message}`);
  }

  return null;
}

// ============================================
// API 엔드포인트: 스트리밍 URL 반환
// ============================================
router.get('/stream-url', validateQuery(Schemas.streamUrlQuery), async (req, res) => {
  const { title, artist, id: trackId } = req.query as { title: string; artist: string; id?: string };

  try {
    let videoId = '';

    // yt_ 접두사가 있으면 바로 유튜브 ID 사용
    if (trackId && trackId.startsWith('yt_')) {
      videoId = trackId.replace('yt_', '');
    } else {
      // MusicBrainz ID 등인 경우 → Piped 검색으로 유튜브 ID 찾기
      const searchQuery = `${artist} - ${title}`;
      console.log(`[Stream URL] Searching Piped for: "${searchQuery}"`);
      const foundId = await searchYouTubeViaPiped(searchQuery);
      if (!foundId) {
        return res.status(404).json({ error: 'YouTube video not found' });
      }
      videoId = foundId;
    }

    console.log(`[Stream URL] Getting audio for videoId: ${videoId}`);
    const audioUrl = await getAudioUrlFromPiped(videoId);
    
    console.log(`[Stream URL] Success! Audio URL length: ${audioUrl.length}`);
    res.json({ url: audioUrl });
  } catch (error: any) {
    console.error('[Stream URL Exception]:', error.message);
    res.status(500).json({ error: 'Failed to get stream URL', details: error.message });
  }
});

// ============================================
// API 엔드포인트: MP3 다운로드 (온라인: Piped + ffmpeg)
// ============================================
router.get('/download', validateQuery(Schemas.downloadQuery), async (req, res) => {
  const { title, artist } = req.query as { title: string; artist: string };
  const filename = `${artist} - ${title}.mp3`;

  try {
    // 1. Piped로 유튜브 검색
    const searchQuery = `${artist} - ${title}`;
    console.log(`[Download] Searching Piped for: "${searchQuery}"`);
    const videoId = await searchYouTubeViaPiped(searchQuery);
    
    if (!videoId) {
      return res.status(404).json({ error: 'YouTube video not found for download' });
    }

    // 2. Piped에서 오디오 URL 가져오기
    const audioUrl = await getAudioUrlFromPiped(videoId);
    console.log(`[Download] Got audio URL, starting ffmpeg conversion...`);

    // 3. ffmpeg로 MP3 변환하면서 브라우저로 전송
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    const converter = spawn('ffmpeg', [
      '-i', audioUrl,        // Piped에서 받은 오디오 URL을 직접 입력
      '-f', 'mp3',           // MP3 형식
      '-ab', '192k',         // 비트레이트 192kbps (다운로드는 고품질)
      '-v', 'error',
      'pipe:1',              // stdout으로 출력
    ]);

    converter.stdout.pipe(res);

    converter.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.error(`[Download ffmpeg]: ${msg}`);
    });

    converter.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Download] ffmpeg exited with code ${code}`);
        if (!res.headersSent) res.status(500).end();
      } else {
        console.log(`[Download] Successfully converted: ${filename}`);
      }
    });

    req.on('close', () => {
      converter.kill();
    });
  } catch (error: any) {
    console.error('[Download Exception]:', error.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to download track' });
  }
});

// ============================================
// API 엔드포인트: MusicBrainz 검색 (기존 유지)
// ============================================
router.get('/search', validateQuery(Schemas.searchQuery), async (req, res) => {
  const query = req.query.q as string;

  const cachedData = cache.get(query);
  if (cachedData) {
    console.log(`Cache hit for: ${query}`);
    return res.json(cachedData);
  }

  try {
    const response = await axios.get('https://musicbrainz.org/ws/2/recording', {
      params: { query, fmt: 'json', limit: 10 },
      headers: { 'User-Agent': config.mbUserAgent },
    });

    const recordings = response.data.recordings || [];
    const tracks: Track[] = recordings.map((rec: any) => {
      const release = rec.releases?.[0];
      const artist = rec['artist-credit']?.[0]?.name || 'Unknown Artist';
      const releaseMbid = release?.id;

      return {
        id: rec.id,
        title: rec.title,
        artist,
        album: release?.title || 'Unknown Album',
        duration: rec.length ? Math.floor(rec.length / 1000) : 0,
        coverUrl: releaseMbid ? `https://coverartarchive.org/release/${releaseMbid}/front` : null,
        releaseYear: release?.date ? release.date.split('-')[0] : 'Unknown',
      };
    });

    const result = { tracks };
    cache.set(query, result);
    res.json(result);
  } catch (error: any) {
    console.error('MusicBrainz search error:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from MusicBrainz' });
  }
});

// ============================================
// API 엔드포인트: 유튜브 검색 (Piped API 사용)
// ============================================
router.get('/yt-search', validateQuery(Schemas.searchQuery), async (req, res) => {
  const query = req.query.q as string;

  const cacheKey = `ytsearch:${query}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`[YT Search] Cache Hit: "${query}"`);
    return res.json(cachedData);
  }

  try {
    console.log(`[YT Search] Searching Piped for: "${query}"`);

    // Piped API로 검색
    const data = await pipedFetch(`/search?q=${encodeURIComponent(query + ' music')}&filter=music_songs`);
    let items = data.items || [];
    
    // music_songs에서 결과가 없으면 일반 검색
    if (items.length === 0) {
      const fallback = await pipedFetch(`/search?q=${encodeURIComponent(query + ' music')}&filter=videos`);
      items = fallback.items || [];
    }

    const tracks: Track[] = items
      .filter((item: any) => item.url && item.url.includes('/watch?v='))
      .slice(0, 15)
      .map((item: any) => {
        const videoId = item.url.replace('/watch?v=', '');
        return {
          id: `yt_${videoId}`,
          title: (item.title || '').replace(/Official (Audio|Video|Music Video)/gi, '').trim(),
          artist: item.uploaderName || item.uploader || 'Unknown Artist',
          album: 'YouTube Music',
          duration: item.duration || 0,
          coverUrl: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          releaseYear: new Date().getFullYear().toString(),
          tags: [query.replace('#', '')],
        };
      });

    const result = { tracks };
    cache.set(cacheKey, result, 3600);
    res.json(result);
  } catch (error: any) {
    console.error('[YT Search] Piped search error:', error.message);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

// ============================================
// API 엔드포인트: 가사 검색 (기존 유지)
// ============================================
router.get('/lyrics', validateQuery(Schemas.lyricsQuery), async (req, res) => {
  const { title, artist, album, duration } = req.query as {
    title: string; artist: string; album?: string; duration?: string;
  };

  const cacheKey = `lyrics:${artist}:${title}`;
  const cachedLyrics = cache.get(cacheKey);
  if (cachedLyrics) return res.json(cachedLyrics);

  try {
    const fetchParams: any = { artist_name: artist, track_name: title };
    if (album && album !== 'Unknown Album') fetchParams.album_name = album;
    if (duration && Number(duration) > 0) fetchParams.duration = duration;

    let response;
    try {
      response = await axios.get('https://lrclib.net/api/get', {
        params: fetchParams,
        timeout: 5000,
      });
    } catch (e: any) {
      if (e.response?.status === 404) {
        const searchRes = await axios.get('https://lrclib.net/api/search', {
          params: { q: `${artist} ${title}` },
          timeout: 5000,
        });
        if (searchRes.data.length > 0) {
          response = { data: searchRes.data[0] };
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }

    const { plainLyrics, syncedLyrics, instrumental } = response.data;
    const lyricsResult = { plainLyrics, syncedLyrics, instrumental };
    cache.set(cacheKey, lyricsResult, 3600);
    res.json(lyricsResult);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Lyrics not found' });
    }
    console.error('Lyrics fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
});

// ============================================
// 진단용 엔드포인트 (디버깅용, 추후 삭제 가능)
// ============================================
router.get('/debug-stream', async (req, res) => {
  const { id, title, artist } = req.query as { id?: string; title?: string; artist?: string };
  
  try {
    let videoId = '';
    if (id && id.startsWith('yt_')) {
      videoId = id.replace('yt_', '');
    } else if (title && artist) {
      const found = await searchYouTubeViaPiped(`${artist} - ${title}`);
      videoId = found || 'NOT_FOUND';
    } else {
      return res.json({ error: 'id 또는 title+artist 필요' });
    }

    const streamData = await pipedFetch(`/streams/${videoId}`);
    const audioStreams = streamData.audioStreams || [];
    
    res.json({
      videoId,
      title: streamData.title,
      uploader: streamData.uploader,
      duration: streamData.duration,
      audioStreamCount: audioStreams.length,
      audioStreams: audioStreams.map((s: any) => ({
        quality: s.quality,
        bitrate: s.bitrate,
        format: s.format,
        mimeType: s.mimeType,
        urlLength: s.url?.length,
      })),
    });
  } catch (err: any) {
    res.json({ error: err.message });
  }
});

export default router;
