'use client';

import React, { useState } from 'react';
import { Play, Plus, Music2, Trash2, Download } from "lucide-react";
import { Track } from "@music-player/shared";
import { cn } from "../lib/utils";
import { FavoritePicker } from "./FavoritePicker";
import { downloadTrack } from "../lib/api";

interface TrackCardProps {
  track: Track;
  onClick: () => void;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onPlusClick: (id: string | null) => void;
  isPickerOpen: boolean;
  onClosePicker: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function TrackCard({ 
  track, 
  onClick, 
  selected, 
  onSelect, 
  onPlusClick, 
  isPickerOpen, 
  onClosePicker,
  onDelete
}: TrackCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex flex-col gap-3 group cursor-pointer relative" onClick={onClick}>
      {/* Selection Checkbox */}
      {onSelect && (
        <div 
          onClick={onSelect}
          className={cn(
            "absolute top-3 left-3 z-10 w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer",
            selected 
              ? "bg-primary border-primary text-black" 
              : "bg-black/40 border-white/20 opacity-0 group-hover:opacity-100"
          )}
        >
          {selected && <div className="w-4 h-4 bg-black rounded-sm" />}
        </div>
      )}

      {onDelete && (
        <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              downloadTrack(track);
            }}
            className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/20 hover:border-primary/40 transition-all"
            title="음원 다운로드"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all"
            title="목록에서 제거"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Show download only if not in history (no onDelete) */}
      {!onDelete && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            downloadTrack(track);
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/20 hover:border-primary/40 transition-all opacity-0 group-hover:opacity-100"
          title="음원 다운로드"
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      <div className="relative aspect-square rounded-2xl overflow-hidden glass-card bg-white/5">
        <div className={cn("absolute inset-0 bg-linear-to-t from-primary/20 via-transparent to-transparent opacity-60")} />
        
        {track.coverUrl && !imageError ? (
          <img 
            src={track.coverUrl} 
            alt={track.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-primary/20 bg-white/5">
            <Music2 size={40} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">{track.title[0]}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-2xl">
            <Play className="w-6 h-6 fill-current ml-1" />
          </div>
        </div>
      </div>

      <div className="flex flex-col pl-1 relative">
        <div className="flex items-start justify-between">
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{track.title}</h3>
            <p className="text-[10px] text-muted-foreground font-medium truncate">{track.artist}</p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onPlusClick(isPickerOpen ? null : track.id);
            }}
            className="p-1 hover:text-primary transition-colors text-muted-foreground"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {isPickerOpen && (
          <div className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl" onClick={e => e.stopPropagation()}>
            <FavoritePicker 
              track={track} 
              onClose={onClosePicker} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
