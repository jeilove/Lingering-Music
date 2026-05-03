'use client';

import React from 'react';
import { Play, Plus, Sparkles } from "lucide-react";
import { SearchSection } from "../components/SearchSection";
import { TagSection } from "../components/TagSection";
import { FavoritePicker } from "../components/FavoritePicker";
import { Track } from "@music-player/shared";
import { usePlayerStore } from "../store/usePlayerStore";
import { cn } from "../lib/utils";

import { AIRecommendation } from "../components/AIRecommendation";

import { TrackCard } from "../components/TrackCard";

export default function Home() {
  const [openPickerId, setOpenPickerId] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const recommendations = usePlayerStore(state => state.recommendations);
  const setCurrentTrack = usePlayerStore(state => state.setCurrentTrack);
  const addToHistory = usePlayerStore(state => state.addToHistory);
  const setTrackExcluded = usePlayerStore(state => state.setTrackExcluded);

  const handlePlay = (track: Track) => {
    setCurrentTrack(track);
    addToHistory(track);
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (confirm(`${selectedIds.size}개의 곡을 추천에서 제외하시겠습니까?`)) {
      for (const id of selectedIds) {
        await setTrackExcluded(id, true);
      }
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="p-8 pb-12 flex flex-col gap-12 max-w-[1600px] mx-auto">
      {/* Top Header & Navigation & Search */}
      <div className="sticky top-0 bg-black/40 backdrop-blur-2xl py-6 z-40 -mx-8 px-8 border-b border-white/5">
        <SearchSection />
      </div>

      {/* Recommended Section */}
      <section className="flex flex-col gap-8 h-fit">
        <div className="flex items-end justify-between px-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">당신을 위한 추천</h2>
            <p className="text-muted-foreground/60 text-xs font-bold tracking-widest uppercase">3회 이상 재생했거나 유사한 태그를 기반으로 엄선했습니다</p>
          </div>
          <div className="flex items-center gap-4">
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="px-6 py-2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/20 active:scale-95"
              >
                추천 제외 ({selectedIds.size})
              </button>
            )}
            <button className="text-[10px] text-primary/60 hover:text-primary transition-colors font-black uppercase tracking-[0.2em] bg-primary/5 px-4 py-2 rounded-full border border-primary/10">전체보기</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-6">
          {recommendations.length > 0 ? (
            recommendations.map((track) => (
              <TrackCard 
                key={track.id}
                track={track}
                onClick={() => handlePlay(track)}
                selected={selectedIds.has(track.id)}
                onSelect={(e) => toggleSelect(track.id, e)}
                onPlusClick={(id) => setOpenPickerId(id)}
                isPickerOpen={openPickerId === track.id}
                onClosePicker={() => setOpenPickerId(null)}
                onDelete={async () => {
                  if (confirm('이 곡을 추천에서 제외하시겠습니까?')) {
                    await setTrackExcluded(track.id, true);
                  }
                }}
              />
            ))
          ) : (
            <div className="col-span-full py-32 rounded-[40px] border-2 border-dashed border-white/5 bg-white/[0.01] flex flex-col items-center justify-center gap-6 text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary/40 border border-primary/20">
                <Sparkles className="w-10 h-10 animate-pulse" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-white font-black text-xl uppercase tracking-widest">분석 중입니다</p>
                <p className="text-sm text-muted-foreground/60">당신의 취향을 파악하기 위해 최소 3곡 이상의 재생 기록이 필요합니다.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start h-fit border-t border-white/5 pt-12">
        {/* Dynamic Tag Discovery Section */}
        <TagSection />
        
        {/* AI Recommendations Section */}
        <AIRecommendation />
      </div>
    </div>
  );
}
