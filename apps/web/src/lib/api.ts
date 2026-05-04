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
      alert(`크롬 등 브라우저 보안 정책으로 인해 직접 다운로드가 차단되었습니다.\n가장 안전하고 광고가 없는 외부 사이트(Dirpy)를 통해 다운로드를 진행합니다.\n\n다음 화면에서 나오는 '유튜브 주소'를 복사(Ctrl+C)한 뒤, 열리는 사이트 검색창에 붙여넣기(Ctrl+V) 해주세요.`);
      
      const params = new URLSearchParams({ title: track.title, artist: track.artist });
      const res = await fetch(`${API_BASE_URL}/stream-url?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch video ID for download');
      }
      
      const data = await res.json();
      if (data.videoId) {
        const targetUrl = `https://www.youtube.com/watch?v=${data.videoId}`;
        prompt(`아래 주소를 복사(Ctrl+C)한 뒤, 확인을 누르면 열리는 사이트(dirpy)에 붙여넣기 하세요.`, targetUrl);
        window.open('https://dirpy.com/', '_blank');
      } else {
        throw new Error('No video ID returned');
      }
    }
  } catch (error) {
    console.error('Download trigger error:', error);
    alert('다운로드 요청 중 오류가 발생했습니다.');
  }
}
