'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Home, Library, Search, Play, Plus, Loader2, Music2, Download, LogOut, CloudDownload, CloudUpload } from 'lucide-react';
import { Track } from '@music-player/shared';
import { searchMusicYT, downloadTrack } from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import { FavoritePicker } from './FavoritePicker';
import { cn } from '../lib/utils';
interface SearchItemProps {
  track: Track;
  onPlay: (t: Track) => void;
  favorites: any[];
  openPickerId: string | null;
  setOpenPickerId: (id: string | null) => void;
}

function SearchTrackRow({ track, onPlay, favorites, openPickerId, setOpenPickerId }: SearchItemProps) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <div 
      className="grid grid-cols-[2fr_1.5fr_1.5fr_120px] px-6 py-3 items-center hover:bg-white/5 transition-colors group cursor-pointer border-b border-white/5 last:border-0"
      onClick={() => onPlay(track)}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 glass-card">
          {track.coverUrl && !imageError ? (
            <img 
              src={track.coverUrl} 
              alt={track.title} 
              className="w-full h-full object-cover transition-transform group-hover:scale-110" 
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <Music2 className="w-4 h-4 text-primary/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-4 h-4 text-white fill-current" />
          </div>
        </div>
        <span className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
          {track.title}
        </span>
      </div>
      
      <div className="text-sm text-muted-foreground truncate pr-4">
        {track.artist}
      </div>
      
      <div className="text-sm text-muted-foreground truncate pr-4">
        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] uppercase tracking-wide">
          {track.album || 'Unknown'}
        </span>
      </div>
      
      <div className="relative flex justify-end gap-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            downloadTrack(track);
          }}
          className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-white transition-all"
          title="음원 다운로드"
        >
          <Download className="w-4 h-4" />
        </button>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setOpenPickerId(openPickerId === track.id ? null : track.id);
          }}
          className={cn(
            "w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all",
            favorites.some(g => g.tracks.some((t: Track) => t.id === track.id))
              ? "bg-primary text-white border-primary shadow-[0_0_12px_rgba(255,100,200,0.3)]"
              : "text-muted-foreground hover:bg-white/10 hover:text-white"
          )}
        >
          <Plus className={cn("w-4 h-4 transition-transform", openPickerId === track.id && "rotate-45")} />
        </button>

        {openPickerId === track.id && (
          <div 
            className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <FavoritePicker 
              track={track} 
              onClose={() => setOpenPickerId(null)} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function SearchSection() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<Track[]>([]);
  const [displayCount, setDisplayCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setCurrentTrack, addToHistory, favorites, recentTracks, history, restoreFromBackup } = usePlayerStore();

  const handleBackup = () => {
    const data = { history, favorites, tracks: recentTracks };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibe_music_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        if (confirm('현재 데이터를 덮어쓰고 복원하시겠습니까?')) {
          setIsLoading(true);
          await restoreFromBackup(data);
        }
      } catch (err) {
        alert('백업 파일 형식이 올바르지 않습니다.');
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setDisplayCount(10); // Reset pagination on new search
    try {
      const tracks = await searchMusicYT(query);
      setAllResults(tracks);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentResults = allResults.slice(0, displayCount);
  const hasMore = displayCount < allResults.length;

  const handlePlay = (track: Track) => {
    setCurrentTrack(track);
    addToHistory(track);
  };

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Search Input & Navigation & Login */}
      <div className="flex items-center gap-3 w-full max-w-7xl mx-auto px-4">
        {/* App Title */}
        <div className="mr-8 flex-shrink-0 hidden lg:block">
          <h1 className="text-xl font-black tracking-tighter text-white whitespace-nowrap bg-linear-to-br from-white via-white to-white/20 bg-clip-text text-transparent italic">
            석이의 머무는 음악
          </h1>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1.5 mr-2">
          <Link 
            href="/" 
            className={cn(
              "p-3 rounded-full transition-all group relative",
              pathname === '/' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}
            title="홈"
          >
            <Home className="w-5 h-5" />
            {pathname === '/' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
          </Link>
          <Link 
            href="/library" 
            className={cn(
              "p-3 rounded-full transition-all group relative",
              pathname === '/library' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}
            title="라이브러리"
          >
            <Library className="w-5 h-5" />
            {pathname === '/library' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
          </Link>
        </div>

        <form onSubmit={handleSearch} className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="오늘 어떤 음악이 듣고 싶나요? 가수, 제목, 앨범 검색..."
            className="w-full h-12 bg-white/5 border border-white/10 rounded-full pl-12 pr-6 text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all glass placeholder:text-muted-foreground/30 text-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <button 
            type="submit"
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-4 bg-primary rounded-xl text-xs font-semibold hover:brightness-110 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}
          </button>
        </form>

        {/* Backup/Restore Tools */}
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleRestore} 
            accept=".json" 
            className="hidden" 
          />
          <button 
            onClick={handleBackup}
            className="p-2 h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-white transition-all glass shrink-0 group"
            title="데이터 백업 (다운로드)"
          >
            <CloudDownload className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-white transition-all glass shrink-0 group"
            title="백업 데이터 복원 (업로드)"
          >
            <CloudUpload className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {status === 'loading' ? (
          <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse" />
        ) : session ? (
          <div className="flex items-center gap-3 h-12 px-2 bg-white/5 border border-white/10 rounded-full glass shrink-0">
            <div className="flex items-center gap-2 pl-2">
              <img 
                src={session.user?.image || ''} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-white/20"
              />
              <span className="text-xs font-bold text-white hidden md:inline max-w-[100px] truncate">
                {session.user?.name}
              </span>
            </div>
            <button 
              onClick={() => signOut()}
              className="p-2 text-muted-foreground hover:text-rose-400 transition-colors rounded-full hover:bg-white/5"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => signIn('google')}
            className="h-12 px-5 bg-white/5 border border-white/10 rounded-full flex items-center gap-3 text-xs font-bold text-white hover:bg-white/10 hover:border-primary/40 transition-all glass group shrink-0"
            title="DB 동기화를 위해 로그인하세요"
          >
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <span className="hidden md:inline">Google 로그인</span>
          </button>
        )}
      </div>

      {/* Results Table */}
      {allResults.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-6">
            <h3 className="text-xl font-bold">검색 결과</h3>
            <span className="text-xs text-muted-foreground">
              {allResults.length}개의 곡 중 {currentResults.length}개 표시 중
            </span>
          </div>
          
          <div className="glass-card overflow-hidden flex flex-col">
            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_120px] px-6 py-4 border-b border-white/5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              <div>제목</div>
              <div>아티스트</div>
              <div>앨범</div>
              <div className="text-right">액션</div>
            </div>
            
            <div className="flex flex-col">
              {currentResults.map((track) => (
                <SearchTrackRow 
                  key={track.id}
                  track={track}
                  onPlay={handlePlay}
                  favorites={favorites}
                  openPickerId={openPickerId}
                  setOpenPickerId={setOpenPickerId}
                />
              ))}
            </div>

            {hasMore && (
              <div className="p-4 border-t border-white/5 flex justify-center">
                <button 
                  onClick={() => setDisplayCount(prev => prev + 10)}
                  className="px-8 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 hover:border-primary/40 transition-all active:scale-95 shadow-xl glass transition-all"
                >
                  더 보기 ({allResults.length - displayCount}개 남음)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {!isLoading && allResults.length === 0 && query && (
        <div className="py-12 text-center text-muted-foreground">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
