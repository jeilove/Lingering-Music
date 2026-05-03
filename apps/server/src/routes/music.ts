import { Router, type Router as ExpressRouter } from 'express';
import axios from 'axios';
import { execFile, spawn } from 'child_process';
import type { Track } from '@music-player/shared';
import { cache } from '../cache';
import { config } from '../config';
import { Schemas, validateQuery } from '../schemas';

const router: ExpressRouter = Router();

router.get('/stream-url', validateQuery(Schemas.streamUrlQuery), async (req, res) => {
  const { title, artist, id: trackId } = req.query as { title: string; artist: string; id?: string };

  const cacheKey = trackId ? `stream:${trackId}` : `stream:${artist}:${title}`;
  const cachedUrl = cache.get(cacheKey);
  if (cachedUrl) {
    return res.json({ url: cachedUrl });
  }

  try {
    let args = [
      '--get-url',
      '--format', 'bestaudio/best',
      '--no-playlist',
      '--ignore-errors',
    ];

    if (trackId && trackId.startsWith('yt_')) {
      const realYtId = trackId.replace('yt_', '');
      args.unshift(`https://www.youtube.com/watch?v=${realYtId}`);
      console.log(`[Stream URL] Direct YouTube ID: ${realYtId}`);
    } else {
      const keyword = `${artist} - ${title} official audio`;
      args.unshift(`ytsearch2:${keyword}`);
      console.log(`[Stream URL] Searching for: "${keyword}"`);
    }

    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile(config.ytdlpPath, args, {
        timeout: 45000,
        encoding: 'utf8',
        env: { ...process.env, PYTHONIOENCODING: 'utf8' },
      }, (error: any, stdout: string, stderr: string) => {
        if (error && !stdout) reject(error);
        else resolve({ stdout: (stdout || '').trim(), stderr: stderr || '' });
      });
    });

    if (stderr) console.warn('[Stream URL Warning]:', stderr);

    const streamUrl = stdout.split('\n')[0]?.trim();
    if (!streamUrl) throw new Error('Stream URL not found');

    cache.set(cacheKey, streamUrl, 300);
    res.json({ url: streamUrl });
  } catch (error: any) {
    console.error('YouTube matching error:', error.message);
    res.status(500).json({ error: 'Failed to find streaming source from YouTube' });
  }
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
