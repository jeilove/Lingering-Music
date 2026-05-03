'use client';

import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Tag, Play, Music2, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Track } from '@music-player/shared';

import { CompactTrackItem } from './CompactTrackItem';

export function TagSection() {
  const { 
    allTags, 
    loadAllTags, 
    filteredTracks, 
    setFilteredTracksByTag, 
    setCurrentTrack, 
    addToHistory,
    activeTag,
    setActiveTag
  } = usePlayerStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (allTags.length === 0) {
      loadAllTags();
    }
  }, []);

  const handleTagClick = (tag: string | null) => {
    if (!tag || activeTag === tag) {
      setActiveTag(null);
      setFilteredTracksByTag(null);
    } else {
      setActiveTag(tag);
      setFilteredTracksByTag(tag);
    }
  };

  const filteredTags = allTags.filter((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <section className="flex flex-col gap-6 h-fit">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          태그 디스커버리
        </h2>
        
        <div className="relative w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input 
            type="text" 
            placeholder="태그 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Tags Cloud */}
      <div className="flex flex-wrap gap-2">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag: string) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                activeTag === tag
                  ? "bg-primary text-black border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] scale-105"
                  : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white"
              )}
            >
              {tag}
            </button>
          ))
        ) : (
          <p className="text-sm text-white/20 italic p-4">등록된 태그가 없습니다. 노래에 태그를 추가해보세요!</p>
        )}
      </div>

      {/* Filtered Tracks List */}
      {activeTag && (
        <div className="mt-4 glass-card rounded-3xl overflow-hidden border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-primary/10 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
            <span className="text-sm font-bold text-primary">'{activeTag}' 태그가 포함된 노래</span>
            <button onClick={() => handleTagClick(null)} className="text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto custom-scrollbar overflow-x-hidden">
            {filteredTracks.length > 0 ? (
              filteredTracks.map((track: Track) => (
                <CompactTrackItem 
                  key={track.id}
                  track={track}
                  onClick={() => {
                    setCurrentTrack(track);
                    addToHistory(track);
                  }}
                  accentColor="primary"
                />
              ))
            ) : (
              <p className="text-sm text-white/30 text-center py-8">이 태그가 포함된 곡을 찾을 수 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
