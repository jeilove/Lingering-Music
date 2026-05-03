import fs from 'fs';
import path from 'path';
import { Track, FavoriteGroup, PlayHistory } from '@music-player/shared';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface LocalDBData {
  tracks: Record<string, Track>;
  history: PlayHistory[];
  favoriteGroups: FavoriteGroup[];
}

const DEFAULT_DATA: LocalDBData = {
  tracks: {},
  history: [],
  favoriteGroups: []
};

class LocalDB {
  private data: LocalDBData = { ...DEFAULT_DATA };
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private isSaving = false;
  private pendingSave = false;

  constructor() {
    this.init();
    // 프로세스 종료 시 미저장 데이터 flush
    process.on('exit', () => this.flushSync());
    process.on('SIGINT', () => { this.flushSync(); process.exit(0); });
    process.on('SIGTERM', () => { this.flushSync(); process.exit(0); });
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(content);
      } catch (error) {
        console.error('[LocalDB] Parse error, starting fresh:', error);
        this.data = { ...DEFAULT_DATA };
      }
    } else {
      this.flushSync();
    }
  }

  // 비동기 debounce 쓰기 (100ms 내 여러 변경을 한 번에 처리)
  private save() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushAsync(), 100);
  }

  private async flushAsync() {
    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }
    this.isSaving = true;
    try {
      await fs.promises.writeFile(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
      if (this.pendingSave) {
        this.pendingSave = false;
        await this.flushAsync();
      }
    } catch (error) {
      console.error('[LocalDB] Write error:', error);
    } finally {
      this.isSaving = false;
    }
  }

  // 프로세스 종료 시 동기 flush (마지막 데이터 보장)
  private flushSync() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('[LocalDB] Sync flush error:', error);
    }
  }

  // Tracks
  saveTrack(track: Track) {
    this.data.tracks[track.id] = track;
    this.save();
  }

  getTrack(id: string) {
    return this.data.tracks[id] || null;
  }

  updateTrackTags(trackId: string, tags: string[]) {
    if (this.data.tracks[trackId]) {
      this.data.tracks[trackId].tags = tags;
      this.save();
    }
  }

  getAllTags() {
    const allTags = new Set<string>();
    Object.values(this.data.tracks).forEach(t => {
      t.tags?.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }

  getTracksByTag(tag: string) {
    return Object.values(this.data.tracks).filter(t => t.tags?.includes(tag));
  }

  // Favorites
  getFavoriteGroups() {
    return this.data.favoriteGroups;
  }

  saveFavoriteGroup(group: FavoriteGroup) {
    const idx = this.data.favoriteGroups.findIndex(g => g.id === group.id);
    if (idx >= 0) {
      this.data.favoriteGroups[idx] = group;
    } else {
      this.data.favoriteGroups.push(group);
    }
    this.save();
  }

  deleteFavoriteGroup(id: string) {
    this.data.favoriteGroups = this.data.favoriteGroups.filter(g => g.id !== id);
    this.save();
  }

  // History
  getHistory(limit: number = 200) {
    return this.data.history.slice(0, limit);
  }

  addHistory(trackId: string, track?: Track) {
    if (track) this.saveTrack(track);
    
    // Unshift to put newest at the beginning
    this.data.history.unshift({
      trackId,
      playedAt: Date.now()
    });

    // Keep only recent 1000 items
    if (this.data.history.length > 1000) {
      this.data.history = this.data.history.slice(0, 1000);
    }
    this.save();
  }

  removeFromHistory(trackId: string) {
    this.data.history = this.data.history.filter(h => h.trackId !== trackId);
    this.save();
  }

  bulkSave(tracks: Track[], history: PlayHistory[], favorites: FavoriteGroup[]) {
    tracks.forEach(t => { this.data.tracks[t.id] = t; });
    
    // For history, we want to reconcile, not duplicate
    if (history.length > 0) {
      this.data.history = [...history, ...this.data.history]
        .sort((a, b) => b.playedAt - a.playedAt)
        .filter((h, i, arr) => i === arr.findIndex(x => x.trackId === h.trackId && x.playedAt === h.playedAt))
        .slice(0, 1000);
    }

    if (favorites.length > 0) {
      this.data.favoriteGroups = favorites;
    }
    
    this.save();
  }

  getRecommendations(): Track[] {
    // 1. Get unique tracks from history (limit 300 entries)
    const history = this.data.history.slice(0, 300);
    const uniquePlayedIds = Array.from(new Set(history.map(h => h.trackId)));
    
    // 2. Aggregate tags and artists from history and favorites
    const tagCounts: Record<string, number> = {};
    const artistCounts: Record<string, number> = {};
    
    const processTrack = (id: string, weight: number = 1) => {
      const track = this.data.tracks[id];
      if (!track) return;
      
      if (track.tags) {
        track.tags.forEach(t => {
          tagCounts[t] = (tagCounts[t] || 0) + weight;
        });
      }
      
      if (track.artist) {
        artistCounts[track.artist] = (artistCounts[track.artist] || 0) + weight;
      }
    };

    uniquePlayedIds.forEach(id => processTrack(id, 1));
    
    // Favorites get more weight (weight 3)
    this.data.favoriteGroups.forEach(g => {
      g.tracks.forEach(t => processTrack(t.id, 3));
    });

    // 3. Get top tags and artists
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(e => e[0]);

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);

    const recommendedTracks = new Map<string, Track>();

    // 4. Collect tracks by tags
    topTags.forEach(tag => {
      this.getTracksByTag(tag).forEach(t => {
        if (!t.excludeFromRecs) recommendedTracks.set(t.id, t);
      });
    });

    // 5. Collect tracks by artists (fallback/enrichment)
    if (recommendedTracks.size < 20) {
      Object.values(this.data.tracks).forEach(t => {
        if (topArtists.includes(t.artist) && !t.excludeFromRecs) {
          recommendedTracks.set(t.id, t);
        }
      });
    }

    // 6. Global fallback
    if (recommendedTracks.size < 10) {
      Object.values(this.data.tracks).slice(0, 20).forEach(t => {
        if (!t.excludeFromRecs) recommendedTracks.set(t.id, t);
      });
    }

    // 7. Filter out recently played (optional, but let's keep some)
    // 8. Shuffle and return
    return Array.from(recommendedTracks.values())
      .sort(() => Math.random() - 0.5)
      .slice(0, 30);
  }

  getRecentTracks(limit: number = 30): Track[] {
    const history = this.data.history.slice(0, limit * 3);
    const uniqueTrackIds: string[] = [];
    const seen = new Set<string>();
    
    for (const h of history) {
      if (!seen.has(h.trackId)) {
        seen.add(h.trackId);
        uniqueTrackIds.push(h.trackId);
        if (uniqueTrackIds.length >= limit) break;
      }
    }

    return uniqueTrackIds
      .map(id => this.data.tracks[id])
      .filter((t): t is Track => !!t);
  }
}

export const localDB = new LocalDB();
