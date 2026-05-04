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

// Helper to get cookies arg if file exists
const getCookiesArg = () => {
  const path1 = path.resolve(process.cwd(), 'apps/server/cookies.txt');
  const path2 = path.resolve(process.cwd(), 'cookies.txt');
  const finalPath = fs.existsSync(path1) ? path1 : (fs.existsSync(path2) ? path2 : null);

  if (finalPath) {
    const stats = fs.statSync(finalPath);
    console.log(`[Cookies] Found at: ${finalPath} (Size: ${stats.size} bytes)`);
    return ['--cookies', finalPath];
  }
  console.warn('[Cookies] File NOT found! yt-dlp will run without authentication.');
  return [];
};

// ============================================
// 진단용 엔드포인트: yt-dlp가 뭘 하고 있는지 100% 확인
// ============================================
router.get('/debug-stream', async (req, res) => {
  const { id, title, artist } = req.query as { id?: string; title?: string; artist?: string };
  
  let target = '';
  if (id && id.startsWith('yt_')) {
    target = `https://www.youtube.com/watch?v=${id.replace('yt_', '')}`;
  } else if (title && artist) {
    target = `ytsearch1:${artist} - ${title}`;
  } else {
    return res.json({ error: 'id 또는 title+artist 필요' });
  }

  const cookiesArgs = getCookiesArg();
  const args = [
    target,
    '--dump-json',          // 실제 다운로드 없이 정보만 출력
    '--format', 'bestaudio/best',
    '--no-playlist',
    '--extractor-args', 'youtube:player_client=ios,web',
    '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    '--referer', 'https://www.youtube.com/',
    ...cookiesArgs,
  ];

  console.log(`[Debug] Running: ${config.ytdlpPath} ${args.join(' ')}`);

  try {
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      let stdout = '';
      let stderr = '';
      const proc = spawn(config.ytdlpPath, args);
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? -1 }));
      // 30초 타임아웃
      setTimeout(() => { proc.kill(); resolve({ stdout, stderr, code: -999 }); }, 30000);
    });

    res.json({
      target,
      ytdlpPath: config.ytdlpPath,
      cookiesUsed: cookiesArgs.length > 0 ? cookiesArgs[1] : 'NONE',
      exitCode: result.code,
      stdoutLength: result.stdout.length,
      stderrFull: result.stderr,
      // stdout이 JSON이면 파싱, 아니면 앞 500자만
      stdoutPreview: result.stdout.substring(0, 500),
    });
  } catch (err: any) {
    res.json({ error: err.message });
  }
});

router.get('/stream', async (req, res) => {
  const { id, title, artist } = req.query as { id?: string; title?: string; artist?: string };
  
  try {
    // ID가 yt_로 시작하면 직접 유튜브 URL 사용, 아니면 검색
    let target = '';
    if (id && id.startsWith('yt_')) {
      target = `https://www.youtube.com/watch?v=${id.replace('yt_', '')}`;
    } else if (title && artist) {
      target = `ytsearch1:${artist} - ${title}`;
    } else {
      return res.status(400).json({ error: 'Missing track identification' });
    }

    console.log(`[Stream Relay] Starting stream for: ${target}`);
    
    // 브라우저가 인식할 수 있는 MP3 형식으로 응답
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Accept-Ranges', 'none');

    const ytdlpArgs = [
      target,
      '--format', 'bestaudio/best',
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=ios,web',
      '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      '--referer', 'https://www.youtube.com/',
      '-o', '-',
      ...getCookiesArg(),
    ];

    // yt-dlp → ffmpeg(MP3 변환) → 브라우저 파이프라인
    const downloader = spawn(config.ytdlpPath, ytdlpArgs);
    const converter = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-f', 'mp3',
      '-ab', '128k',
      '-v', 'error',
      'pipe:1',
    ]);

    downloader.stdout.pipe(converter.stdin);
    converter.stdout.pipe(res);

    // ★ 모든 stderr 출력을 로그로 남김 (에러 필터링 없이!)
    downloader.stderr.on('data', (data) => {
      console.error(`[Stream Relay yt-dlp stderr]: ${data.toString().trim()}`);
    });

    converter.stderr.on('data', (data) => {
      console.error(`[Stream Relay ffmpeg stderr]: ${data.toString().trim()}`);
    });

    downloader.on('close', (code) => {
      console.log(`[Stream Relay] yt-dlp exited with code ${code}`);
      converter.stdin.end();
    });

    converter.on('close', (code) => {
      console.log(`[Stream Relay] ffmpeg exited with code ${code}`);
      if (code !== 0 && !res.headersSent) res.status(500).end();
    });

    req.on('close', () => {
      console.log(`[Stream Relay] Client disconnected, cleaning up.`);
      downloader.kill();
      converter.kill();
    });
  } catch (error: any) {
    console.error('[Stream Relay Exception]:', error.message);
    if (!res.headersSent) res.status(500).json({ error: 'Streaming failed' });
  }
});

router.get('/stream-url', validateQuery(Schemas.streamUrlQuery), async (req, res) => {
  const { title, artist, id: trackId } = req.query as { title: string; artist: string; id?: string };
  
  // Now we return our own STABLE relay URL instead of a fragile direct YouTube URL
  const params = new URLSearchParams();
  if (trackId) params.append('id', trackId);
  if (title) params.append('title', title);
  if (artist) params.append('artist', artist);

  const relayUrl = `${config.baseUrl}/api/stream?${params.toString()}`;
  console.log(`[Stream URL] Returning stable relay link: ${relayUrl}`);
  
  res.json({ url: relayUrl });
});

router.get('/download', validateQuery(Schemas.downloadQuery), async (req, res) => {
  const { title, artist } = req.query as { title: string; artist: string };

  const keyword = `${artist} - ${title} official audio`;
  const filename = `${artist} - ${title}.mp3`;

  try {
    const args = [
      `ytsearch1:${keyword}`,
      '--get-url',
      '--format', 'bestaudio',
      '--no-playlist',
      '--ignore-errors',
      ...getCookiesArg(),
    ];

    const { stdout: cleanUrl } = await new Promise<{ stdout: string }>((resolve, reject) => {
      execFile(config.ytdlpPath, args, {
        timeout: 30000,
        encoding: 'utf8',
        env: { ...process.env, PYTHONIOENCODING: 'utf8' },
      }, (error: any, stdout: string) => {
        if (error && !stdout) reject(error);
        else resolve({ stdout: (stdout || '').trim() });
      });
    });

    if (!cleanUrl) throw new Error('Download URL not found');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    const downloader = spawn(config.ytdlpPath, [
      cleanUrl,
      '--ignore-errors',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', '-',
      '--no-playlist',
    ]);

    downloader.stdout.pipe(res);

    downloader.on('close', (code) => {
      if (code !== 0) {
        console.error(`yt-dlp download failed with code ${code}`);
        if (!res.headersSent) res.status(500).end();
      }
    });

    req.on('close', () => downloader.kill());
  } catch (error: any) {
    console.error('Download error:', error.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to download track' });
  }
});

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

router.get('/yt-search', validateQuery(Schemas.searchQuery), async (req, res) => {
  const query = req.query.q as string;

  const cacheKey = `ytsearch:${query}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`[YT Search] Cache Hit: "${query}"`);
    return res.json(cachedData);
  }

  try {
    const queryHex = Buffer.from(query).toString('hex');
    console.log(`[YT Search] Fetching from YouTube: "${query}" (Hex: ${queryHex})`);

    const args = [
      `ytsearch15:${query} music`,
      '--flat-playlist',
      '--print', '%(id)s\t%(title)s\t%(uploader)s\t%(duration)s\t%(thumbnail)s',
      '--no-playlist',
      '--ignore-errors',
      '--quiet',
      '--no-warnings',
      ...getCookiesArg(),
    ];

    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile(config.ytdlpPath, args, {
        timeout: 20000,
        encoding: 'utf8',
        env: { ...process.env, PYTHONIOENCODING: 'utf8' },
      }, (error: any, stdout: string, stderr: string) => {
        if (error && !stdout) reject(error);
        else resolve({ stdout: stdout.trim(), stderr });
      });
    });

    if (stderr) console.warn('[YT Search Warning]:', stderr);

    const tracks: Track[] = stdout.trim().split('\n')
      .filter(l => l.trim())
      .map(line => {
        const parts = line.split('\t');
        if (parts.length < 5) return null;
        const [id, title, artist, duration, thumbnail] = parts;
        if (id === 'NA') return null;

        const validThumbnail = thumbnail && thumbnail !== 'NA'
          ? thumbnail
          : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

        return {
          id: `yt_${id}`,
          title: title.replace(/Official (Audio|Video|Music Video)/gi, '').trim(),
          artist: artist === 'NA' ? 'Unknown Artist' : artist,
          album: 'YouTube Music',
          duration: duration === 'NA' ? 0 : parseInt(duration) || 0,
          coverUrl: validThumbnail,
          releaseYear: new Date().getFullYear().toString(),
          tags: [query.replace('#', '')],
        };
      })
      .filter(Boolean) as Track[];

    const result = { tracks };
    cache.set(cacheKey, result, 3600);
    res.json(result);
  } catch (error: any) {
    console.error('YT Search error:', error.message);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

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

export default router;
