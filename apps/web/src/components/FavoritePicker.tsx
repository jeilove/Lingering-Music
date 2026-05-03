'use client';

import React, { useState } from 'react';
import { Plus, FolderPlus, Check, X } from 'lucide-react';
import { Track } from '@music-player/shared';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';

interface FavoritePickerProps {
  track: Track;
  onClose?: () => void;
}

export function FavoritePicker({ track, onClose }: FavoritePickerProps) {
  const { favorites, createGroup, addTrackToGroup, removeTrackFromGroup, removeFromAllGroups } = usePlayerStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const assignedGroupIds = favorites
    .filter(g => g.tracks.some(t => t.id === track.id))
    .map(g => g.id);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      await createGroup(newGroupName.trim());
      setNewGroupName('');
      setIsCreating(false);
    }
  };

  const handleToggleGroup = async (groupId: string) => {
    const isAssigned = assignedGroupIds.includes(groupId);
    if (isAssigned) {
      await removeTrackFromGroup(track.id, groupId);
    } else {
      await addTrackToGroup(track, groupId);
    }
    // We don't close anymore on selection to allow multiple picks
  };

  return (
    <div className="flex flex-col gap-2 p-2 min-w-[200px] glass-card shadow-2xl animate-in fade-in zoom-in duration-200 z-[100]">
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/5">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">즐겨찾기 그룹 선택</span>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar">
        {favorites.map((group) => {
          const isAssigned = assignedGroupIds.includes(group.id);
          return (
            <button
              key={group.id}
              onClick={() => handleToggleGroup(group.id)}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                isAssigned 
                  ? "bg-primary/20 text-primary" 
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <span>{group.name}</span>
              {isAssigned && <Check className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/5 mt-1 pt-2">
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-3 py-2 w-full text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors font-bold"
          >
            <FolderPlus className="w-4 h-4" />
            새 그룹 만들기
          </button>
        ) : (
          <form onSubmit={handleCreateGroup} className="flex gap-1 px-1">
            <input
              autoFocus
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="그룹 이름..."
              className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
            />
            <button type="submit" className="bg-primary text-white p-1 rounded-md hover:bg-primary/80">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {assignedGroupIds.length > 0 && (
        <button
          onClick={async () => {
            await removeFromAllGroups(track.id);
            if (onClose) onClose();
          }}
          className="text-[10px] text-rose-400/70 hover:text-rose-400 mt-1 uppercase font-bold tracking-tighter transition-colors text-right px-2"
        >
          모든 그룹에서 제거
        </button>
      )}
    </div>
  );
}
