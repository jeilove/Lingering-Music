import { Track } from '@music-player/shared';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';

export async function searchMusic(query: string): Promise<Track[]> {
  if (!query) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    const data = await response.json();
    return data.tracks || [];
  } catch (error) {
    console.error('Error searching music:', error);
    return [];
  }
}

export async function searchMusicYT(query: string): Promise<Track[]> {
  if (!query) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/yt-search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`YT Search failed: ${response.status}`);
    const data = await response.json();
    return data.tracks || [];
  } catch (error) {
    console.error('Error searching music on YT:', error);
    return [];
  }
}

export async function getStreamUrl(title: string, artist: string, id?: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ title, artist });
    if (id) params.append('id', id);
    
    const url = `${API_BASE_URL}/stream-url?${params.toString()}`;
    console.log(`[getStreamUrl] Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch stream URL');
    
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Stream URL error:', error);
    return null;
  }
}

export interface LyricsData {
  plainLyrics?: string;
  syncedLyrics?: string;
  instrumental?: boolean;
}

export async function getLyrics(title: string, artist: string, album?: string, duration?: number): Promise<LyricsData | null> {
  try {
    const params = new URLSearchParams({
      title,
      artist
    });
    if (album) params.append('album', album);
    if (duration) params.append('duration', duration.toString());

    const url = `${API_BASE_URL}/lyrics?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch lyrics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Lyrics error:', error);
    return null;
  }
}

export async function downloadTrack(track: Track): Promise<void> {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  try {
    if (isLocal) {
      console.log(`[Download] Local environment detected. Triggering backend yt-dlp download...`);
      alert(`'${track.title}' 음원 추출 및 다운로드를 시작합니다.\n추출에 10~30초 정도 소요될 수 있습니다. 잠시만 기다려 주세요.`);
      const params = new URLSearchParams({ title: track.title, artist: track.artist });
      window.location.assign(`${API_BASE_URL}/download?${params.toString()}`);
    } else {
      console.log(`[Download] Production environment detected. Redirecting to external downloader...`);
      alert(`온라인(Render) 환경에서는 구글 봇 차단 및 브라우저 다운로드 차단을 우회하기 위해, 무료/무광고 외부 다운로드 사이트(Dirpy)로 연결해 드립니다.\n\n새 창이 열리면 화면 우측 하단의 [Record Audio] 버튼을 눌러 mp3로 저장해 주세요.`);
      
      const params = new URLSearchParams({ title: track.title, artist: track.artist });
      const res = await fetch(`${API_BASE_URL}/stream-url?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch video ID for download');
      }
      
      const data = await res.json();
      if (data.videoId) {
        const targetUrl = `https://dirpy.com/studio?url=https://www.youtube.com/watch?v=${data.videoId}`;
        window.open(targetUrl, '_blank');
      } else {
        throw new Error('No video ID returned');
      }
    }
  } catch (error) {
    console.error('Download trigger error:', error);
    alert('다운로드 요청 중 오류가 발생했습니다.');
  }
}
