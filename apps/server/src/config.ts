import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs';
dotenv.config();

const isWindows = os.platform() === 'win32';

if (!process.env.YTDLP_PATH && isWindows) {
  console.warn('[Config] YTDLP_PATH 환경변수가 설정되지 않았습니다. 윈도우 환경에서는 yt-dlp 기능이 동작하지 않을 수 있습니다.');
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  // On Render/Linux, yt-dlp is installed at /usr/local/bin/yt-dlp
  ytdlpPath: process.env.YTDLP_PATH || (isWindows ? path.resolve(process.cwd(), '../../.venv/Scripts/yt-dlp.exe') : '/usr/local/bin/yt-dlp'),
  mbUserAgent: process.env.MB_USER_AGENT || 'VibeMusicPlayer/1.0.0',
  baseUrl: process.env.BASE_URL || 'https://lingering-music.onrender.com',
  cookiesPath: fs.existsSync(path.resolve(process.cwd(), 'apps/server/cookies.txt')) 
    ? path.resolve(process.cwd(), 'apps/server/cookies.txt')
    : path.resolve(process.cwd(), 'cookies.txt'),
} as const;
