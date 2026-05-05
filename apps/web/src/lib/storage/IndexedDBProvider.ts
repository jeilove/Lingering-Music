import Dexie, { type Table } from 'dexie';
import { Storage, Track, FavoriteGroup, PlayHistory } from '@music-player/shared';

export class MusicDatabase extends Dexie {
  tracks!: Table<Track>;
  history!: Table<PlayHistory & { id?: number }>;
  favoriteGroups!: Table<FavoriteGroup>;
  searchCache!: Table<{ query: string; results: Track[]; createdAt: number }>;

  constructor() {
    super('MusicPlayerDB');
    this.version(2).stores({
      tracks: 'id, title, artist, album, *tags',
      history: '++id, trackId, playedAt',
      favoriteGroups: 'id, name',
      searchCache: 'query, createdAt'
    });
  }
}

export class IndexedDBProvider implements Storage {
  private db: MusicDatabase;

  constructor() {
    this.db = new MusicDatabase();
  }

  async init(): Promise<void> {
    // Dexie automatically opens if needed, or we can explicitly open
    await this.db.open();
  }

  // Tracks
  async saveTrack(track: Track): Promise<void> {
    await this.db.tracks.put(track);
  }

  async getTrack(id: string): Promise<Track | null> {
    const track = await this.db.tracks.get(id);
    return track || null;
  }

  async updateTrackTags(trackId: string, tags: string[]): Promise<void> {
    // Ensure track exists, if not we can't update. 
    // Usually the store handles ensuring track is saved.
    const exists = await this.db.tracks.get(trackId);
    if (exists) {
      await this.db.tracks.update(trackId, { tags });
    }
  }

  async getAllTags(): Promise<string[]> {
    // Dexie way to get unique keys from a multi-entry index
    const tags = await this.db.tracks.orderBy('tags').uniqueKeys();
    return tags.filter((t): t is string => typeof t === 'string' && t.startsWith('#')).sort();
  }

  async getTracksByTag(tag: string): Promise<Track[]> {
    return await this.db.tracks
      .where('tags')
      .equals(tag)
      .toArray();
  }

  // Favorites
  async getFavoriteGroups(): Promise<FavoriteGroup[]> {
    return await this.db.favoriteGroups.toArray();
  }

  async saveFavoriteGroup(group: FavoriteGroup): Promise<void> {
    await this.db.favoriteGroups.put(group);
  }

  async deleteFavoriteGroup(id: string): Promise<void> {
    await this.db.favoriteGroups.delete(id);
  }

  // History
  async getHistory(limit: number = 50): Promise<PlayHistory[]> {
    return await this.db.history
      .orderBy('playedAt')
      .reverse()
      .limit(limit)
      .toArray() as PlayHistory[];
  }

  async removeFromHistory(trackId: string): Promise<void> {
    await this.db.history.where('trackId').equals(trackId).delete();
  }

  async addHistory(trackId: string, track?: Track): Promise<void> {
    // CRITICAL: Ensure the track metadata exists in the tracks table
    // so getRecentTracks can find it later.
    if (track) {
      await this.db.tracks.put(track);
    }

    await this.db.history.add({
      trackId,
      playedAt: Date.now()
    });
    
    // Cleanup old history (keep only recent 200)
    const count = await this.db.history.count();
    if (count > 200) {
      const oldest = await this.db.history.orderBy('playedAt').limit(count - 200).toArray();
      const ids = oldest.map(h => h.id).filter((id): id is number => id !== undefined);
      await this.db.history.bulkDelete(ids);
    }
  }

  async getRecentTracks(limit: number = 30): Promise<Track[]> {
    const history = await this.getHistory(limit * 3); // Fetch more to ensure we have enough unique ones
    const uniqueTrackIds: string[] = [];
    const seen = new Set<string>();
    
    for (const h of history) {
      if (!seen.has(h.trackId)) {
        seen.add(h.trackId);
        uniqueTrackIds.push(h.trackId);
        if (uniqueTrackIds.length >= limit) break;
      }
    }

    const tracks = await this.db.tracks.where('id').anyOf(uniqueTrackIds).toArray();
    
    // Return in the order found in history
    return uniqueTrackIds.map(id => tracks.find(t => t.id === id)).filter((t): t is Track => !!t);
  }

  async renameFavoriteGroup(id: string, newName: string): Promise<void> {
    const group = await this.db.favoriteGroups.get(id);
    if (group) {
      group.name = newName;
      await this.db.favoriteGroups.put(group);
    }
  }

  async getRecommendations(): Promise<Track[]> {
    // 1. Get all history to count plays
    const allHistory = await this.db.history.toArray();
    const playCounts = new Map<string, number>();
    allHistory.forEach(h => {
      playCounts.set(h.trackId, (playCounts.get(h.trackId) || 0) + 1);
    });

    // 2. Tracks played 3+ times
    const topTrackIds = Array.from(playCounts.entries())
      .filter(([_, count]) => count >= 3)
      .map(([id, _]) => id);

    if (topTrackIds.length === 0) return [];

    const topTracks = await this.db.tracks.where('id').anyOf(topTrackIds).toArray();

    // 3. Collect tags from top tracks
    const topTags = new Set<string>();
    topTracks.forEach(t => t.tags?.forEach(tag => topTags.add(tag)));

    // 4. Find other tracks with these tags
    const recommendedTracks: Track[] = [...topTracks];
    const seenIds = new Set(topTracks.map(t => t.id));

    if (topTags.size > 0) {
      const tagMatchedTracks = await this.db.tracks
        .where('tags')
        .anyOf(Array.from(topTags))
        .toArray();
      
      tagMatchedTracks.forEach(t => {
        if (!seenIds.has(t.id) && !t.excludeFromRecs) {
          recommendedTracks.push(t);
          seenIds.add(t.id);
        }
      });
    }

    // Final filter for excluded tracks
    return recommendedTracks.filter(t => !t.excludeFromRecs);
  }

  async getAIRecommendations(count: number = 4): Promise<Track[]> {
    const allHistory = await this.db.history.toArray();
    const playCounts = new Map<string, number>();
    allHistory.forEach(h => {
      playCounts.set(h.trackId, (playCounts.get(h.trackId) || 0) + 1);
    });

    const topTrackIds = Array.from(playCounts.entries())
      .filter(([_, c]) => c >= 3)
      .map(([id, _]) => id);

    if (topTrackIds.length === 0) return [];

    const topTracks = await this.db.tracks.where('id').anyOf(topTrackIds).toArray();
    const topTags = new Set<string>();
    topTracks.forEach(t => t.tags?.forEach(tag => topTags.add(tag)));

    if (topTags.size === 0) return [];

    const potentialTracks = await this.db.tracks
      .where('tags')
      .anyOf(Array.from(topTags))
      .toArray();

    const filtered = potentialTracks.filter(t => !t.excludeFromRecs);
    
    // Pick unique records
    const unique = Array.from(new Map(filtered.map(t => [t.id, t])).values());

    // Shuffle and pick 4
    return unique
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }

  async setTrackExcluded(trackId: string, excluded: boolean): Promise<void> {
    const track = await this.db.tracks.get(trackId);
    if (track) {
      await this.db.tracks.update(trackId, { excludeFromRecs: excluded });
    }
  }

  // Sync is not implemented for IndexedDB local-only
  async sync(): Promise<void> {
    return Promise.resolve();
  }

  async getLocalStats() {
    const [trackCount, historyCount, favoriteCount] = await Promise.all([
      this.db.tracks.count(),
      this.db.history.count(),
      this.db.favoriteGroups.count(),
    ]);
    return {
      tracks: trackCount,
      history: historyCount,
      favorites: favoriteCount
    };
  }
}
