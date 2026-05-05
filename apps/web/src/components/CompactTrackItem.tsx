'use client';

import React from 'react';
import { Play, Music2, Download } from 'lucide-react';
import { Track } from '@music-player/shared';
import { cn } from '../lib/utils';
import { downloadTrack } from '../lib/api';

interface CompactTrackItemProps {
  track: Track;
  onClick: () => void;
  active?: boolean;
  accentColor?: 'primary' | 'amber';
}

export function CompactTrackItem({ track, onClick, active, accentColor = 'primary' }: CompactTrackItemProps) {
  const [imageError, setImageError] = React.useState(false);

  const accentClass = accentColor === 'amber' ? 'text-amber-400' : 'text-primary';
  const accentIconClass = accentColor === 'amber' ? 'text-amber-400/40' : 'text-primary/40';

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer relative",
        active && "bg-white/10"
      )}
    >
      <div className="w-8 h-8 rounded-lg overflow-hidden glass-card flex-shrink-0 relative bg-white/5">
        {track.coverUrl && track.coverUrl !== 'NA' && !track.coverUrl.startsWith('/') && !imageError ? (
          <img 
            src={track.coverUrl} 
            alt={track.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className={cn("w-3.5 h-3.5", accentIconClass)} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Play className="w-3 h-3 fill-current text-white" />
        </div>
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <h4 className={cn(
          "text-[13px] font-bold truncate transition-colors",
          active ? accentClass : "text-white group-hover:" + accentClass
        )}>
          {track.title}
        </h4>
        <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
        {track.tags && track.tags.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {track.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className={cn("text-[8px] font-black uppercase tracking-wider opacity-90", accentClass)}>#{tag.replace('#', '')}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            downloadTrack(track);
          }}
          className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-white transition-all opacity-0 group-hover:opacity-100"
          title="다운로드"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-white font-bold tabular-nums">
          {Math.floor((track.duration || 0) / 60)}:{((track.duration || 0) % 60).toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
