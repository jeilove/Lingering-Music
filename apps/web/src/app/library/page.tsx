'use client';

import React, { useEffect, useState } from 'react';
import { Play, Heart, Clock, User, LogOut, Plus, Edit3, Sparkles, Waves, Navigation, X } from 'lucide-react';
import { Track, FavoriteGroup } from '@music-player/shared';
import { usePlayerStore } from '../../store/usePlayerStore';
import { cn } from '../../lib/utils';
import { FavoritePicker } from '../../components/FavoritePicker';
import { TrackCard } from '../../components/TrackCard';
import { CompactTrackItem } from '../../components/CompactTrackItem';

export default function LibraryPage() {
  const { 
    recentTracks, favorites, loadHistory, loadFavorites, 
    setCurrentTrack, addToHistory, renameGroup,
    selectedGroupId, setSelectedGroupId,
    removeFromHistory // Added
  } = usePlayerStore();
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    loadHistory();
    loadFavorites();
  }, []);

  // Derived state: selected group object
  const selectedGroup = favorites.find(f => f.id === selectedGroupId) || (favorites.length > 0 ? (selectedGroupId ? null : favorites[0]) : null);

  // Auto-set first group if nothing selected
  useEffect(() => {
    if (!selectedGroupId && favorites.length > 0) {
      setSelectedGroupId(favorites[0].id);
    }
  }, [favorites, selectedGroupId]);

  const handleRename = async () => {
    if (selectedGroup && editingName.trim()) {
      await renameGroup(selectedGroup.id, editingName.trim());
      setIsEditingGroupName(false);
    }
  };

  const handlePlay = (track: Track) => {
    setCurrentTrack(track);
    addToHistory(track);
  };

  const handleDeleteHistory = async (trackId: string) => {
    if (confirm('이 곡을 최근 재생 목록에서 삭제하시겠습니까?')) {
      await removeFromHistory(trackId);
    }
  };

  return (
    <div className="p-8 pb-32 flex flex-col gap-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">Your Library</h1>
          <p className="text-muted-foreground text-sm">재생 기록과 즐겨찾는 플레이리스트를 관리하세요.</p>
        </div>
      </div>

      {/* Recently Played */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            최근 재생한 곡
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {recentTracks.length > 0 ? (
            recentTracks.map((track) => (
              <TrackCard 
                key={track.id}
                track={track}
                onClick={() => handlePlay(track)}
                onPlusClick={(id) => setOpenPickerId(id)}
                isPickerOpen={openPickerId === track.id}
                onClosePicker={() => setOpenPickerId(null)}
                onDelete={() => handleDeleteHistory(track.id)}
              />
            ))
          ) : (
            <div className="col-span-full py-12 glass-card flex items-center justify-center text-muted-foreground text-sm italic">
              아직 재생 기록이 없습니다. 음악을 들어보세요!
            </div>
          )}
        </div>
      </section>

      {/* Favorites List Details */}
      {selectedGroup && (
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1 flex-1">
              {!isEditingGroupName ? (
                <div className="flex items-center gap-3 group/title">
                  <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500 fill-current" />
                    {selectedGroup.name}
                  </h2>
                  <button 
                    onClick={() => {
                      setEditingName(selectedGroup.name);
                      setIsEditingGroupName(true);
                    }}
                    className="p-1 text-muted-foreground hover:text-primary opacity-0 group-hover/title:opacity-100 transition-opacity"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input 
                    autoFocus
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    className="bg-white/5 border border-white/20 rounded-lg px-3 py-1 text-xl font-bold text-white focus:outline-none focus:border-primary min-w-[300px]"
                  />
                  <button onClick={handleRename} className="px-3 py-1 bg-primary text-white rounded-lg text-sm font-bold">저장</button>
                  <button onClick={() => setIsEditingGroupName(false)} className="px-3 py-1 bg-white/5 text-muted-foreground rounded-lg text-sm font-bold">취소</button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{selectedGroup.tracks.length}개의 곡이 저장됨</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
             <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar overflow-x-hidden">
              {selectedGroup.tracks.map((track) => (
                <CompactTrackItem 
                  key={track.id}
                  track={track}
                  onClick={() => handlePlay(track)}
                  accentColor="primary"
                />
              ))}
              {selectedGroup.tracks.length === 0 && (
                <div className="col-span-full p-12 text-center text-muted-foreground text-sm italic">
                  이 폴더는 비어 있습니다. 검색 결과에서 곡을 추가해 보세요!
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Favorites Cards Grid */}
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold tracking-tight text-white">즐겨찾기 카드</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
          {favorites.map((group, idx) => {
            const icons = [
              <Heart key="heart" className="w-8 h-8 fill-current" />,
              <Sparkles key="sparkles" className="w-8 h-8 fill-current" />,
              <Waves key="waves" className="w-8 h-8 fill-current" />,
              <Navigation key="nav" className="w-8 h-8 fill-current" />,
            ];
            const icon = icons[idx % icons.length];
            
            return (
              <div 
                key={group.id} 
                onClick={() => setSelectedGroupId(group.id)}
                className={cn(
                  "aspect-square rounded-[32px] p-6 flex flex-col items-center justify-center gap-4 group hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden",
                  selectedGroupId === group.id 
                    ? "bg-[#3D3533] shadow-2xl ring-1 ring-white/10" 
                    : "bg-[#2D2624] hover:bg-[#352D2B]"
                )}
              >
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner",
                  selectedGroupId === group.id ? "bg-[#5D4237] text-orange-500" : "bg-[#3D3533] text-orange-500/50"
                )}>
                  {icon}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <h3 className="text-lg font-bold text-white text-center leading-tight">{group.name}</h3>
                  <p className="text-[10px] text-[#8C8482] uppercase tracking-[0.2em] font-black">
                    {group.tracks.length} Songs
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
