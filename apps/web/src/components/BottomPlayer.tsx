'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, 
  Volume2, Maximize2, ListMusic, Heart, Loader2, Tag, Download 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePlayerStore } from '../store/usePlayerStore';
import { getStreamUrl, downloadTrack } from '../lib/api';

export function BottomPlayer() {
  const { currentTrack, isPlaying, togglePlay } = usePlayerStore();
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Track change effect (Only load stream when ID changes)
  useEffect(() => {
    if (!currentTrack) return;

    let isCancelled = false;

    // 1. Immediately stop old song to prevent overlap
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src'); // Use removeAttribute instead of ""
      audioRef.current.load(); // Reset internal state
      setProgress(0);
    }

    const loadStream = async () => {
      setIsLoading(true);
      try {
        const url = await getStreamUrl(currentTrack.title, currentTrack.artist, currentTrack.id);
        
        // 2. Only apply if this relative request is still valid
        if (url && audioRef.current && !isCancelled) {
          audioRef.current.src = url;
          audioRef.current.load(); // Force reset state
          
          if (isPlaying) {
            audioRef.current.play().catch(e => console.error("Playback start failed:", e));
          }
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadStream();

    return () => {
      isCancelled = true;
    };
  }, [currentTrack?.id]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // IsPlaying toggle effect
  useEffect(() => {
    if (!audioRef.current || !audioRef.current.src) return;
    
    if (isPlaying) {
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const p = (cur / audioRef.current.duration) * 100;
      setProgress(p || 0);
      usePlayerStore.getState().setCurrentTime(cur);
    }
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(Math.round(p * 100));
  };

  if (!currentTrack) return null;

  return (
    <footer className="fixed bottom-0 left-0 w-full h-24 bg-black/80 backdrop-blur-2xl border-t border-white/5 z-60 px-6 flex items-center justify-between">
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate}
        onError={(e) => {
          const target = e.target as HTMLAudioElement;
          if (target.src) {
            console.error("[BottomPlayer] Audio Load Error:", target.error?.message);
            // Optional: Notify user
          }
        }}
        onEnded={() => usePlayerStore.getState().togglePlay()} // Simple loop or stop
      />

      {/* Current Song Info */}
      <div className="flex items-center gap-4 w-[30%] min-w-0">
        <div className="w-14 h-14 rounded-lg overflow-hidden glass-card shrink-0 relative group">
          {isLoading && (
            <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {currentTrack.coverUrl ? (
            <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center text-primary/40">
              <Play className="w-6 h-6 fill-current" />
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <h4 className="text-[15px] font-bold text-white truncate leading-tight group-hover:text-primary cursor-pointer transition-colors">
            {currentTrack.title}
          </h4>
          <p className="text-[12px] text-muted-foreground truncate font-medium">
            {currentTrack.artist}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <button className="text-muted-foreground hover:text-primary transition-colors">
            <Heart className="w-4 h-4" />
          </button>
          {currentTrack.tags && currentTrack.tags.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              <Tag className="w-3 h-3" />
              <span className="font-bold">{currentTrack.tags.length}</span>
            </div>
          )}
          <button 
            onClick={() => downloadTrack(currentTrack)}
            className="text-muted-foreground hover:text-primary transition-colors ml-1"
            title="현재 곡 다운로드"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-col items-center gap-3 w-[40%]">
        <div className="flex items-center gap-6">
          <button className="text-muted-foreground hover:text-white transition-colors">
            <Shuffle className="w-4 h-4" />
          </button>
          <button className="text-white/80 hover:text-white transition-all hover:scale-110">
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          
          <button 
            onClick={togglePlay}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-all shadow-lg hover:shadow-white/10 disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button className="text-white/80 hover:text-white transition-all hover:scale-110">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
          <button className="text-muted-foreground hover:text-white transition-colors">
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground min-w-[30px] text-right font-medium">
            {audioRef.current ? Math.floor(audioRef.current.currentTime / 60) + ":" + ("0" + Math.floor(audioRef.current.currentTime % 60)).slice(-2) : "0:00"}
          </span>
          <div 
            className="relative flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden cursor-pointer group"
            onClick={(e) => {
              if (!audioRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const p = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = p * audioRef.current.duration;
            }}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-linear-to-r from-primary to-blue-400 rounded-full" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <span className="text-[10px] text-muted-foreground min-w-[30px] font-medium">
            {audioRef.current?.duration ? Math.floor(audioRef.current.duration / 60) + ":" + ("0" + Math.floor(audioRef.current.duration % 60)).slice(-2) : "0:00"}
          </span>
        </div>
      </div>

      {/* Extra Controls */}
      <div className="flex items-center gap-4 w-[30%] justify-end">
        <button 
          onClick={() => usePlayerStore.getState().setLyricsOpen(!usePlayerStore.getState().isLyricsOpen)}
          className={cn(
            "text-[10px] h-6 px-2 rounded font-bold border transition-colors",
            usePlayerStore.getState().isLyricsOpen 
              ? "bg-primary text-black border-primary" 
              : "text-muted-foreground border-white/20 hover:text-white hover:border-white/40"
          )}
        >
          LYRICS
        </button>
        <div className="flex items-center gap-3 group">
          <Volume2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <div 
            className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden cursor-pointer relative"
            onClick={handleVolumeChange}
          >
            <div className="h-full bg-white group-hover:bg-primary transition-colors" style={{ width: `${volume}%` }} />
          </div>
        </div>
      </div>
    </footer>
  );
}
