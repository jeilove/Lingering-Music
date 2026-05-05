import { Track } from '@music-player/shared';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:3001/api`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://lingering-music.onrender.com/api';
};

export const API_BASE_URL = getBaseUrl();

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
      console.log(`[Download] Production environment detected. Showing manual download modal...`);
      
      const params = new URLSearchParams({ title: track.title, artist: track.artist });
      const res = await fetch(`${API_BASE_URL}/stream-url?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch video ID for download');
      }
      
      const data = await res.json();
      if (data.videoId) {
        const youtubeUrl = `https://www.youtube.com/watch?v=${data.videoId}`;
        const siteUrl = 'https://ssyou.online/youtube-to-mp3-en2';
        
        // 커스텀 다운로드 안내 모달 생성
        const overlay = document.createElement('div');
        overlay.id = 'download-modal-overlay';
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
          z-index: 10000; backdrop-filter: blur(8px); animation: fadeIn 0.3s ease;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
          background: linear-gradient(145deg, #1e1e1e, #121212); color: white; padding: 32px; 
          border-radius: 24px; width: 90%; max-width: 440px; border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); text-align: center;
        `;
        
        modal.innerHTML = `
          <h3 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #fff;">음원 다운로드 안내</h3>
          <p style="font-size: 15px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6;">
            브라우저 보안 정책으로 인해 직접 다운로드가 제한됩니다.<br/>아래 주소를 복사하여 사이트에서 변환해 주세요.
          </p>
          
          <div style="display: flex; gap: 10px; margin-bottom: 28px; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
            <input type="text" value="${youtubeUrl}" readonly style="
              flex: 1; background: transparent; border: none; color: #e4e4e7;
              padding: 10px 14px; font-size: 14px; outline: none; width: 50%;
            " id="url-input" />
            <button style="
              background: #3b82f6; color: white; border: none; padding: 10px 20px;
              border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
              transition: all 0.2s;
            " id="copy-btn" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">복사</button>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button style="
              background: rgba(255,255,255,0.05); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.1);
              padding: 14px 24px; border-radius: 14px; font-size: 15px; cursor: pointer; flex: 1;
              transition: all 0.2s;
            " id="close-btn" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">닫기</button>
            <button style="
              background: #ef4444; color: white; border: none;
              padding: 14px 24px; border-radius: 14px; font-size: 15px; cursor: pointer; flex: 1.2;
              font-weight: 700; transition: all 0.2s;
            " id="go-btn" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">사이트 이동</button>
          </div>
          
          <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          </style>
        `;
        
        document.body.appendChild(overlay);
        overlay.appendChild(modal);
        
        const copyBtn = modal.querySelector('#copy-btn') as HTMLButtonElement;
        const goBtn = modal.querySelector('#go-btn') as HTMLButtonElement;
        const closeBtn = modal.querySelector('#close-btn') as HTMLButtonElement;
        const urlInput = modal.querySelector('#url-input') as HTMLInputElement;
        
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(youtubeUrl);
            const originalText = copyBtn.innerText;
            copyBtn.innerText = '복사됨!';
            copyBtn.style.background = '#10b981';
            setTimeout(() => { 
              copyBtn.innerText = originalText;
              copyBtn.style.background = '#3b82f6';
            }, 2000);
          } catch (err) {
            urlInput.select();
            document.execCommand('copy');
          }
        };
        
        goBtn.onclick = () => {
          window.open(siteUrl, '_blank');
          document.body.removeChild(overlay);
        };
        
        closeBtn.onclick = () => {
          document.body.removeChild(overlay);
        };
        
        overlay.onclick = (e) => {
          if (e.target === overlay) document.body.removeChild(overlay);
        };

      } else {
        throw new Error('No video ID returned');
      }
    }
  } catch (error) {
    console.error('Download trigger error:', error);
    alert('다운로드 요청 중 오류가 발생했습니다.');
  }
}
