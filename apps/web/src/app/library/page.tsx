'use client';

import React, { useEffect, useState } from 'react';
import { Play, Heart, Clock, User, LogOut, Plus, Edit3, Sparkles, Waves, Navigation, X } from 'lucide-react';
import { Track, FavoriteGroup } from '@music-player/shared';
import { usePlayerStore } from '../../store/usePlayerStore';
import { cn } from '../../lib/utils';
import { FavoritePicker } from '../../components/FavoritePicker';
import { TrackCard } from '../../components/TrackCard';
import { CompactTrackItem } from '../../components/CompactTrackItem';
import { AccordionSection } from '../../components/AccordionSection';
import { SearchSection } from '../../components/SearchSection';

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

  const [diagStats, setDiagStats] = useState<{ local: any, remote: any } | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const stats = await usePlayerStore.getState().getStorageStats();
      setDiagStats(stats);
      await usePlayerStore.getState().forceSync();
    } catch (err) {
      console.error('Diagnostics failed:', err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="p-8 pb-32 flex flex-col gap-12 max-w-[1400px] mx-auto">
      {/* Top Header (Navigation & Search) */}
      <div className="sticky top-0 bg-black/40 backdrop-blur-2xl py-6 z-40 -mx-8 px-8 border-b border-white/5">
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1">
            <SearchSection />
          </div>
        </div>
      </div>

      {/* Diagnostic Center */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
              isDiagnosing ? "bg-primary animate-pulse shadow-lg shadow-primary/40" : "bg-primary/20 text-primary"
            )}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Data Diagnostic Center</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">System Integrity & Sync Status</p>
            </div>
          </div>
          <button 
            disabled={isDiagnosing}
            onClick={runDiagnostics}
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full border transition-all active:scale-95",
              isDiagnosing 
                ? "bg-white/10 border-white/10 text-white/40 cursor-wait" 
                : "bg-white/5 text-white border-white/10 hover:bg-white/10"
            )}
          >
            {isDiagnosing ? "Analyzing..." : "Refresh Stats"}
          </button>
          
          <button 
            disabled={isDiagnosing}
            onClick={async () => {
              setIsDiagnosing(true);
              await usePlayerStore.getState().adoptAnonymousData();
              const stats = await usePlayerStore.getState().getStorageStats();
              setDiagStats(stats);
              setIsDiagnosing(false);
              alert('데이터 복구 시도가 완료되었습니다. 재생 목록을 확인해 보세요!');
            }}
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full border transition-all active:scale-95",
              isDiagnosing 
                ? "bg-white/10 border-white/10 text-white/40 cursor-wait" 
                : "bg-primary text-white border-primary shadow-lg shadow-primary/20 hover:bg-primary/80"
            )}
          >
            {isDiagnosing ? "Recovering..." : "Recover & Adopt My Data"}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local Storage Stats */}
          <div className="glass-card p-6 rounded-[32px] bg-white/[0.02] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Clock className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Local Browser Storage</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">IndexedDB (Offline)</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-8">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Tracks</span>
                <span className="text-3xl font-black text-white tracking-tighter">{diagStats?.local?.tracks ?? '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">History</span>
                <span className="text-3xl font-black text-white tracking-tighter">{diagStats?.local?.history ?? '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Groups</span>
                <span className="text-3xl font-black text-white tracking-tighter">{diagStats?.local?.favorites ?? '-'}</span>
              </div>
            </div>
          </div>

          {/* Remote DB Stats */}
          <div className="glass-card p-6 rounded-[32px] bg-primary/5 border border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Navigation className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Online Cloud DB</p>
                <p className="text-[10px] text-primary/60 uppercase tracking-widest font-black">Neon PostgreSQL (Cloud)</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-6">
              {/* User Specific Stats */}
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Your Specific Data</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Your History</span>
                    <span className="text-2xl font-black text-white tracking-tighter">{diagStats?.remote?.user?.history ?? '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Your Groups</span>
                    <span className="text-2xl font-black text-white tracking-tighter">{diagStats?.remote?.user?.favorites ?? '-'}</span>
                  </div>
                </div>
              </div>

              {/* Global Stats */}
              <div className="grid grid-cols-3 gap-4 opacity-50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Global Tracks</span>
                  <span className="text-lg font-black text-white tracking-tighter">{diagStats?.remote?.global?.tracks ?? '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Global Hist</span>
                  <span className="text-lg font-black text-white tracking-tighter">{diagStats?.remote?.global?.history ?? '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Global Grps</span>
                  <span className="text-lg font-black text-white tracking-tighter">{diagStats?.remote?.global?.favorites ?? '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Active Session Info */}
        <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Session ID</span>
            <span className="text-xs font-mono text-emerald-500/80">{usePlayerStore.getState().userId || 'Guest (Local Only)'}</span>
          </div>
          {diagStats && (
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
              Last Analysis: {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-white italic">Your Library</h1>
          <p className="text-muted-foreground text-sm font-medium">재생 기록과 즐겨찾는 플레이리스트를 관리하세요.</p>
        </div>
      </div>

      {/* Recently Played */}
      <AccordionSection
        title="최근 재생한 곡"
        description="최근에 들었던 곡들을 다시 확인하세요"
        icon={<Clock className="w-6 h-6" />}
      >
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
      </AccordionSection>

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
