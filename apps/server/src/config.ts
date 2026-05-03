import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

if (!process.env.YTDLP_PATH) {
  console.warn('[Config] YTDLP_PATH 환경변수가 설정되지 않았습니다. yt-dlp 기능이 동작하지 않을 수 있습니다.');
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  ytdlpPath: process.env.YTDLP_PATH || path.resolve(process.cwd(), '../../.venv/Scripts/yt-dlp.exe'),
  mbUserAgent: process.env.MB_USER_AGENT || 'VibeMusicPlayer/1.0.0',
} as const;
