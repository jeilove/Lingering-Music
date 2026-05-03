'use client';

import React, { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Sparkles, Play, Music2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Track } from '@music-player/shared';

import { CompactTrackItem } from './CompactTrackItem';

export function AIRecommendation() {
  const { aiRecommendations, loadAIRecommendations, setCurrentTrack, addToHistory } = usePlayerStore();

  return (
    <section className="flex flex-col gap-6 h-fit h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-300" />
          AI 추천
        </h2>
        {aiRecommendations.length > 0 && (
          <button 
            onClick={() => loadAIRecommendations(true)}
            className="text-[10px] text-amber-300/40 hover:text-amber-300 transition-colors uppercase font-bold tracking-widest flex items-center gap-1"
          >
            새로고침
          </button>
        )}
      </div>

      <div className="glass-card rounded-3xl overflow-hidden border border-amber-400/20 h-full flex flex-col items-center justify-center min-h-[120px] max-h-[120px]">
        {aiRecommendations.length > 0 ? (
          <div className="p-2 grid grid-cols-2 gap-2 h-full w-full overflow-y-auto custom-scrollbar overflow-x-hidden">
            {aiRecommendations.map((track: Track) => (
              <CompactTrackItem 
                key={track.id}
                track={track}
                onClick={() => {
                  setCurrentTrack(track);
                  addToHistory(track);
                }}
                accentColor="amber"
              />
            ))}
          </div>
        ) : (
          <button 
            onClick={() => loadAIRecommendations(true)}
            className="group flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center group-hover:bg-amber-400/20 group-hover:border-amber-400/40 transition-all">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold text-amber-300 tracking-widest uppercase">AI 음악 추천받기</span>
              <span className="text-[8px] text-muted-foreground/60">당신의 취향을 분석합니다</span>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
