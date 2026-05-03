'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { getLyrics, LyricsData } from '../lib/api';
import { cn } from '../lib/utils';
import { X, Music2, Tag, Plus } from 'lucide-react';

const RECOMMENDED_TAGS = ['#잔잔한', '#신나는', '#몽환적인', '#슬픈', '#편안한', '#집중', '#운동', '#모닝커피', '#새벽감성', '#비오는날'];

interface LyricLine {
  time: number;
  text: string;
}

export function LyricsPanel() {
  const { currentTrack, isLyricsOpen, setLyricsOpen, currentTime, updateTrackTags } = usePlayerStore();
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLyricsOpen && currentTrack) {
      loadLyrics();
    }
  }, [currentTrack, isLyricsOpen]);

  const loadLyrics = async () => {
    if (!currentTrack) return;
    setIsLoading(true);
    setLyrics(null);
    setParsedLyrics([]);
    
    try {
      const data = await getLyrics(
        currentTrack.title, 
        currentTrack.artist, 
        currentTrack.album, 
        currentTrack.duration ?? undefined
      );
      setLyrics(data);
      if (data?.syncedLyrics) {
        setParsedLyrics(parseLRC(data.syncedLyrics));
      } else if (data?.plainLyrics) {
        // Fallback or plain text display
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = (tag: string) => {
    if (!currentTrack) return;
    const cleanTag = tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`;
    if (cleanTag === '#') return;
    
    const currentTags = currentTrack.tags || [];
    if (!currentTags.includes(cleanTag)) {
      updateTrackTags(currentTrack.id, [...currentTags, cleanTag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!currentTrack || !currentTrack.tags) return;
    updateTrackTags(currentTrack.id, currentTrack.tags.filter(t => t !== tagToRemove));
  };

  const parseLRC = (lrc: string): LyricLine[] => {
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const ms = parseInt(match[3]);
        const time = minutes * 60 + seconds + ms / (match[3].length === 3 ? 1000 : 100);
        const text = line.replace(timeRegex, '').trim();
        if (text) {
          result.push({ time, text });
        }
      }
    });

    return result.sort((a, b) => a.time - b.time);
  };

  // Find active line
  const activeIndex = parsedLyrics.findIndex((line, i) => {
    const nextLine = parsedLyrics[i + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  // Scroll to active line
  useEffect(() => {
    if (activeLineRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeElement = activeLineRef.current;
      
      const scrollPos = activeElement.offsetTop - container.offsetHeight / 2 + activeElement.offsetHeight / 2;
      container.scrollTo({
        top: scrollPos,
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  if (!isLyricsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center p-8 transition-all animate-in fade-in zoom-in duration-300">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/60 pointer-events-none" />
      
      {/* Header */}
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden shadow-2xl glass-card">
            {currentTrack?.coverUrl ? (
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <Music2 className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">{currentTrack?.title}</h2>
            <p className="text-white/60 font-medium">{currentTrack?.artist}</p>
          </div>
        </div>
        <button 
          onClick={() => setLyricsOpen(false)}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group"
        >
          <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Lyrics Content */}
      <div 
        ref={scrollRef}
        className="w-full max-w-4xl h-[60vh] overflow-y-auto mt-16 custom-scrollbar mask-fade-y"
      >
        <div className="py-[30vh] flex flex-col gap-6 text-center">
          {isLoading ? (
            <div className="text-2xl text-white/40 animate-pulse font-medium">가사를 불러오는 중...</div>
          ) : parsedLyrics.length > 0 ? (
            parsedLyrics.map((line, i) => (
              <div 
                key={i}
                ref={i === activeIndex ? activeLineRef : null}
                className={cn(
                   "text-3xl md:text-5xl font-bold transition-all duration-500 cursor-pointer hover:text-white px-4",
                  i === activeIndex 
                    ? "text-primary scale-105 opacity-100" 
                    : i < activeIndex 
                      ? "text-white/20 scale-95" 
                      : "text-white/40"
                )}
              >
                {line.text}
              </div>
            ))
          ) : lyrics?.plainLyrics ? (
            <div className="text-2xl text-white/80 whitespace-pre-wrap leading-relaxed max-w-2xl mx-auto px-6">
              {lyrics.plainLyrics}
            </div>
          ) : (
            <div className="text-2xl text-white/40 font-medium">가사를 찾을 수 없습니다.</div>
          )}
        </div>
      </div>

      {/* Tags Section */}
      <div className="w-full max-w-4xl mt-6 z-10">
        <div className="glass-card p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-white/80">태그 (감정 및 느낌)</span>
          </div>

          {/* Current Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {currentTrack?.tags && currentTrack.tags.length > 0 ? (
              currentTrack.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs font-bold text-primary flex items-center gap-1.5 group cursor-default"
                >
                  {tag}
                  <button 
                    onClick={() => handleRemoveTag(tag)}
                    className="p-0.5 rounded-full hover:bg-primary/30 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-sm text-white/30 italic">등록된 태그가 없습니다.</span>
            )}
          </div>

          {/* Tag Suggestions & Input */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {RECOMMENDED_TAGS.filter(tag => !currentTrack?.tags?.includes(tag)).map(tag => (
                <button
                  key={tag}
                  onClick={() => handleAddTag(tag)}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-white/50 hover:bg-white/10 hover:text-white transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag(newTag)}
                placeholder="직접 입력 (예: #드라이브)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button 
                onClick={() => handleAddTag(newTag)}
                className="absolute right-2 top-1.5 p-1.5 rounded-lg bg-primary text-black hover:scale-105 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
