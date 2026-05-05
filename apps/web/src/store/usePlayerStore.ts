import { create } from 'zustand';
import { Track, FavoriteGroup, PlayHistory } from '@music-player/shared';
import { IndexedDBProvider } from '../lib/storage/IndexedDBProvider';
import { BackendStorageProvider } from '../lib/storage/BackendStorageProvider';
import { searchMusic, searchMusicYT } from '../lib/api';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  history: PlayHistory[];
  recentTracks: Track[]; // Actual track objects for UI
  favorites: FavoriteGroup[];
  recommendations: Track[];
  aiRecommendations: Track[];
  allTags: string[];
  filteredTracks: Track[]; // For tag filtering
  activeTag: string | null;
  selectedGroupId: string | null;
  isLyricsOpen: boolean;
  currentTime: number;
  
  // Actions
  setUserId: (userId: string | null) => Promise<void>;
  setCurrentTrack: (track: Track) => void;
  togglePlay: () => void;
  loadHistory: () => Promise<void>;
  loadFavorites: () => Promise<void>;
  loadRecommendations: () => Promise<void>;
  loadAIRecommendations: (force?: boolean) => Promise<void>;
  addToHistory: (track: Track) => Promise<void>;
  toggleFavorite: (track: Track) => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  renameGroup: (id: string, name: string) => Promise<void>;
  addTrackToGroup: (track: Track, groupId: string) => Promise<void>;
  removeTrackFromGroup: (trackId: string, groupId: string) => Promise<void>;
  removeFromAllGroups: (trackId: string) => Promise<void>;
  refreshRecentTracks: () => Promise<void>;
  updateTrackTags: (trackId: string, tags: string[]) => Promise<void>;
  loadAllTags: () => Promise<void>;
  setFilteredTracksByTag: (tag: string | null) => Promise<void>;
  setActiveTag: (tag: string | null) => void;
  setTrackExcluded: (trackId: string, excluded: boolean) => Promise<void>;
  setSelectedGroupId: (id: string | null) => void;
  setLyricsOpen: (open: boolean) => void;
  removeFromHistory: (trackId: string) => Promise<void>;
  setCurrentTime: (time: number) => void;
  restoreFromBackup: (data: any) => Promise<void>;
}

const storage = new BackendStorageProvider();
const oldLocalStorage = new IndexedDBProvider();

// Initialize storage and load initial state
let isInitialized = false;
let initPromise: Promise<void> | null = null;
let currentUserId: string | null = null;

const migrateData = async () => {
  if (typeof window === 'undefined') return;
  const migrated = localStorage.getItem(`vibe_storage_migrated_${currentUserId || 'anon'}`);
  if (migrated === 'true') return;

  try {
    console.log('[Migration] Starting batch migration...');
    await oldLocalStorage.init();
    
    const history = await oldLocalStorage.getHistory(500);
    const uniqueTrackIds = Array.from(new Set(history.map(h => h.trackId)));
    const tracks: Track[] = [];
    
    for (const trackId of uniqueTrackIds) {
      const t = await oldLocalStorage.getTrack(trackId);
      if (t) tracks.push(t);
    }
    
    const favorites = await oldLocalStorage.getFavoriteGroups();
    await storage.migrateBatch(tracks, history, favorites);

    localStorage.setItem(`vibe_storage_migrated_${currentUserId || 'anon'}`, 'true');
    console.log('[Migration] Batch migration completed.');
  } catch (err) {
    console.error('[Migration] Failed:', err);
  }
};

const initStorage = async (store: any) => {
  if (isInitialized || initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[PlayerStore] Initializing storage for user:', currentUserId);
      await storage.init();
      
      // Perform migration if needed
      await migrateData();
      
      // Batch initial loads
      const [history, recentTracks, favorites, tags, recommendations] = await Promise.all([
        storage.getHistory(),
        storage.getRecentTracks(),
        storage.getFavoriteGroups(),
        storage.getAllTags(),
        storage.getRecommendations()
      ]);

      store.setState({ 
        history, 
        recentTracks, 
        favorites: favorites.length > 0 ? favorites : [{ id: 'default', name: 'My Favorites', tracks: [] }],
        allTags: tags,
        recommendations
      });

      const savedTag = localStorage.getItem('activeTag');
      const savedGroupId = localStorage.getItem('selectedGroupId');
      
      if (savedTag) {
        store.getState().setActiveTag(savedTag);
        await store.getState().setFilteredTracksByTag(savedTag);
      }
      
      if (savedGroupId) {
        store.getState().setSelectedGroupId(savedGroupId);
      }

      isInitialized = true;
      console.log('[PlayerStore] Storage initialized successfully');
    } catch (error) {
      console.error('[PlayerStore] Storage initialization failed:', error);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  history: [],
  recentTracks: [],
  favorites: [],
  recommendations: [],
  aiRecommendations: [],
  allTags: [],
  filteredTracks: [],
  activeTag: null,
  selectedGroupId: null,
  isLyricsOpen: false,
  currentTime: 0,

  setUserId: async (userId) => {
    // Treat undefined/empty as null for consistency
    const normalizedId = userId || null;
    
    if (currentUserId === normalizedId && isInitialized) return;
    
    console.log('[PlayerStore] User ID transition:', currentUserId, '->', normalizedId);
    currentUserId = normalizedId;
    storage.setUserId(normalizedId);
    
    // Hard reset initialization state to force clean reload
    isInitialized = false;
    
    try {
      await initStorage({ setState: set, getState: get });
      console.log('[PlayerStore] Storage re-initialized for user:', normalizedId);
    } catch (error) {
      console.error('[PlayerStore] Failed to re-initialize storage:', error);
    }
  },

  setCurrentTrack: (track) => {
    set({ currentTrack: track, isPlaying: true });
    get().addToHistory(track);
  },
  
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  loadHistory: async () => {
    await storage.init();
    const history = await storage.getHistory();
    const recentTracks = await storage.getRecentTracks();
    set({ history, recentTracks });
  },

  refreshRecentTracks: async () => {
    const recentTracks = await storage.getRecentTracks();
    set({ recentTracks });
  },

  loadFavorites: async () => {
    try {
      await storage.init();
      let groups = await storage.getFavoriteGroups();
      
      // If absolutely no groups exist, we don't force save here to prevent accidental overwrites
      // instead we handle it in the UI or when first items are added.
      // But for better UX, we can keep the default group in state WITHOUT saving it to DB yet
      if (groups.length === 0) {
        groups = [{ id: 'default', name: 'My Favorites', tracks: [] }];
      }
      set({ favorites: groups });
    } catch (error) {
      console.error('[PlayerStore] Failed to load favorites:', error);
    }
  },
  
  loadRecommendations: async () => {
    await storage.init();
    const recommendations = await storage.getRecommendations();
    set({ recommendations });
  },

  loadAIRecommendations: async (force = false) => {
    if (!force && get().aiRecommendations.length > 0) return;
    
    await storage.init();
    
    // 1. Get top tags from history
    const allHistory = await storage.getHistory(200);
    const playCounts = new Map<string, number>();
    allHistory.forEach(h => {
      playCounts.set(h.trackId, (playCounts.get(h.trackId) || 0) + 1);
    });

    const topTrackIds = Array.from(playCounts.entries())
      .filter(([_, c]) => c >= 3)
      .map(([id, _]) => id);

    if (topTrackIds.length === 0) {
      set({ aiRecommendations: [] });
      return;
    }

    const topTracks = await Promise.all(topTrackIds.slice(0, 5).map(id => storage.getTrack(id)));
    const topTags = new Set<string>();
    topTracks.forEach(t => t?.tags?.forEach(tag => {
      // Clean tag for better search (remove # and trim)
      const clean = tag.replace('#', '').trim();
      if (clean) topTags.add(clean);
    }));

    const tagsArr = Array.from(topTags);
    if (tagsArr.length === 0) {
      set({ aiRecommendations: [] });
      return;
    }

    // 2. Pick a random tag and search externally (Use YouTube for better thumbnails/music results)
    const randomTag = tagsArr[Math.floor(Math.random() * tagsArr.length)];
    console.log(`[AI Recs] Searching YouTube for tag: "${randomTag}"`);
    const tracks = await searchMusicYT(`${randomTag} song`);
    
    // 3. Filter and limit for the 2-column layout
    const filtered = tracks.filter(t => !t.excludeFromRecs).slice(0, 8);
    set({ aiRecommendations: filtered });
  },
  
  loadAllTags: async () => {
    await storage.init();
    const tags = await storage.getAllTags();
    set({ allTags: tags });
  },

  setFilteredTracksByTag: async (tag) => {
    if (!tag) {
      set({ filteredTracks: [] });
      return;
    }
    await storage.init();
    const tracks = await storage.getTracksByTag(tag);
    set({ filteredTracks: tracks });
  },

  setActiveTag: (tag) => {
    set({ activeTag: tag });
    if (tag) localStorage.setItem('activeTag', tag);
    else localStorage.removeItem('activeTag');
  },

  addToHistory: async (track) => {
    await storage.init();
    // addHistory now handles metadata saving too
    await storage.addHistory(track.id, track);
    
    // Refresh local lists
    const recentTracks = await storage.getRecentTracks();
    const history = await storage.getHistory();
    set({ history, recentTracks });
    
    // Reload recommendations after a delay to avoid noise
    await get().loadRecommendations();
  },

  removeFromHistory: async (trackId) => {
    await storage.init();
    await storage.removeFromHistory(trackId);
    
    // Refresh local lists
    const recentTracks = await storage.getRecentTracks();
    const history = await storage.getHistory();
    set({ history, recentTracks });
  },

  createGroup: async (name) => {
    await storage.init();
    const newGroup = { id: `group_${Date.now()}`, name, tracks: [] };
    await storage.saveFavoriteGroup(newGroup);
    await get().loadFavorites();
  },

  renameGroup: async (id, name) => {
    await storage.init();
    await storage.renameFavoriteGroup(id, name);
    await get().loadFavorites();
  },

  addTrackToGroup: async (track, groupId) => {
    await storage.init();
    await storage.saveTrack(track);
    
    // Use the latest groups from DB
    const allGroups = await storage.getFavoriteGroups();
    const targetGroup = allGroups.find(g => g.id === groupId);
    
    if (targetGroup) {
      // Avoid duplicates
      if (!targetGroup.tracks.some(t => t.id === track.id)) {
        targetGroup.tracks.push(track);
        await storage.saveFavoriteGroup(targetGroup);
      }
    }

    await get().loadFavorites();
  },

  removeTrackFromGroup: async (trackId, groupId) => {
    await storage.init();
    const groups = await storage.getFavoriteGroups();
    const targetGroup = groups.find(g => g.id === groupId);
    
    if (targetGroup) {
      targetGroup.tracks = targetGroup.tracks.filter(t => t.id !== trackId);
      await storage.saveFavoriteGroup(targetGroup);
    }
    
    await get().loadFavorites();
  },

  removeFromAllGroups: async (trackId) => {
    await storage.init();
    const groups = await storage.getFavoriteGroups();
    for (const g of groups) {
      if (g.tracks.some(t => t.id === trackId)) {
        g.tracks = g.tracks.filter(t => t.id !== trackId);
        await storage.saveFavoriteGroup(g);
      }
    }
    await get().loadFavorites();
  },

  toggleFavorite: async (track) => {
    // Legacy support: toggle existence in 'default' group
    await storage.init();
    await storage.saveTrack(track);
    
    let groups = await storage.getFavoriteGroups();
    let mainGroup = groups.find(g => g.id === 'default' || g.name === 'My Favorites');
    
    if (!mainGroup) {
      // Create it if missing
      mainGroup = { id: 'default', name: 'My Favorites', tracks: [] };
      await storage.saveFavoriteGroup(mainGroup);
    }

    const exists = mainGroup.tracks.some(t => t.id === track.id);
    if (exists) {
      mainGroup.tracks = mainGroup.tracks.filter(t => t.id !== track.id);
    } else {
      mainGroup.tracks.push(track);
    }

    await storage.saveFavoriteGroup(mainGroup);
    await get().loadFavorites();
  },

  updateTrackTags: async (trackId, tags) => {
    await storage.init();
    
    // Ensure track exists in DB (maybe it's from search results)
    const currentTrack = get().currentTrack;
    if (currentTrack && currentTrack.id === trackId) {
      await storage.saveTrack({ ...currentTrack, tags });
    } else {
      // Fallback: update only if exists, or do nothing? 
      // Safest is to avoid empty track creation but we need metadata to save track.
      // If we don't have currentTrack, we try to update existing one.
      await storage.updateTrackTags(trackId, tags);
    }
    
    // Update local state...
    if (currentTrack && currentTrack.id === trackId) {
      set({ currentTrack: { ...currentTrack, tags } });
    }
    
    // Update in recentTracks/history too
    const recentTracks = get().recentTracks.map(t => 
      t.id === trackId ? { ...t, tags } : t
    );
    set({ recentTracks });
    
    // Update in favorite groups
    const favorites = get().favorites.map(group => ({
      ...group,
      tracks: group.tracks.map(t => t.id === trackId ? { ...t, tags } : t)
    }));
    set({ favorites });

    // Refresh all tags list
    await get().loadAllTags();
    await get().loadRecommendations(); 
    await get().loadAIRecommendations(); 
  },

  setTrackExcluded: async (trackId, excluded) => {
    await storage.init();
    await storage.setTrackExcluded(trackId, excluded);
    await get().loadRecommendations();
    await get().loadAIRecommendations();
  },

  setSelectedGroupId: (id) => {
    set({ selectedGroupId: id });
    if (id) localStorage.setItem('selectedGroupId', id);
    else localStorage.removeItem('selectedGroupId');
  },

  setLyricsOpen: (open) => set({ isLyricsOpen: open }),
  setCurrentTime: (time) => set({ currentTime: time }),

  restoreFromBackup: async (data) => {
    await storage.init();
    
    console.log('[Restore] Original Data Keys:', Object.keys(data));
    
    // 1. Convert tracks (handle both Object and Array)
    let tracks = data.tracks || [];
    if (tracks && typeof tracks === 'object' && !Array.isArray(tracks)) {
      tracks = Object.values(tracks);
    }
    
    // 2. Handle History
    const history = data.history || [];
    
    // 3. Handle Favorites (Defensive check for multiple possible keys)
    // Legacy db.json uses 'favoriteGroups', some versions might use 'favorites' or 'groups'
    const favorites = data.favorites || data.favoriteGroups || data.groups || [];
    
    console.log('[Restore] Processed Data:', {
      tracksCount: tracks.length,
      historyCount: history.length,
      favoritesCount: favorites.length
    });
    
    if (favorites.length === 0) {
      console.warn('[Restore] No favorites found! Data sample:', JSON.stringify(data).substring(0, 500));
    }

    try {
      // Call backend migrate Batch
      await storage.migrateBatch(tracks, history, favorites);
      
      // Reload state
      await get().loadHistory();
      await get().loadFavorites();
      alert(`백업 데이터 복원이 완료되었습니다!\n(노래: ${tracks.length}곡, 히스토리: ${history.length}개, 즐겨찾기: ${favorites.length}그룹)`);
    } catch (error) {
      console.error('[Restore] Migration failed:', error);
      alert('데이터 복구 중 오류가 발생했습니다. 콘솔 로그를 확인해주세요.');
    }
  }
}));

// Trigger initialization
if (typeof window !== 'undefined') {
  initStorage(usePlayerStore);
}
