import { Storage, Track, FavoriteGroup, PlayHistory } from '@music-player/shared';
import { API_BASE_URL } from '../api';

export class BackendStorageProvider implements Storage {
  private userId: string | null = null;

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.userId) {
      headers['x-user-id'] = this.userId;
    }
    return headers;
  }

  async init(): Promise<void> {
    return Promise.resolve();
  }

  // Tracks
  async saveTrack(track: Track): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/storage/tracks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(track)
      });
    } catch (e) {
      console.error('[StorageProvider] saveTrack failed:', e);
    }
  }

  async getTrack(id: string): Promise<Track | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/tracks/${id}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('[StorageProvider] getTrack failed:', e);
      return null;
    }
  }

  async updateTrackTags(trackId: string, tags: string[]): Promise<void> {
    try {
      const track = await this.getTrack(trackId);
      if (track) {
        track.tags = tags;
        await this.saveTrack(track);
      }
    } catch (e) {
      console.error('[StorageProvider] updateTrackTags failed:', e);
    }
  }

  async getAllTags(): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/tags`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('[StorageProvider] getAllTags failed:', e);
      return [];
    }
  }

  async getTracksByTag(tag: string): Promise<Track[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/tracks-by-tag?tag=${encodeURIComponent(tag)}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('[StorageProvider] getTracksByTag failed:', e);
      return [];
    }
  }

  // Favorites
  async getFavoriteGroups(): Promise<FavoriteGroup[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/favorites`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('[StorageProvider] getFavoriteGroups failed:', e);
      return [];
    }
  }

  async saveFavoriteGroup(group: FavoriteGroup): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/storage/favorites`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(group)
      });
    } catch (e) {
      console.error('[StorageProvider] saveFavoriteGroup failed:', e);
    }
  }

  async deleteFavoriteGroup(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/storage/favorites/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
    } catch (e) {
      console.error('[StorageProvider] deleteFavoriteGroup failed:', e);
    }
  }

  async renameFavoriteGroup(id: string, newName: string): Promise<void> {
    try {
      const groups = await this.getFavoriteGroups();
      const group = groups.find(g => g.id === id);
      if (group) {
        group.name = newName;
        await this.saveFavoriteGroup(group);
      }
    } catch (e) {
      console.error('[StorageProvider] renameFavoriteGroup failed:', e);
    }
  }

  // History
  async getHistory(limit: number = 200): Promise<PlayHistory[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/history?limit=${limit}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((h: any) => ({
        ...h,
        playedAt: h.timestamp || h.playedAt
      }));
    } catch (e) {
      console.error('[StorageProvider] getHistory failed:', e);
      return [];
    }
  }

  async addHistory(trackId: string, track?: Track): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/storage/history`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ trackId, track })
      });
    } catch (e) {
      console.error('[StorageProvider] addHistory failed:', e);
    }
  }

  async removeFromHistory(trackId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/storage/history/${trackId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
    } catch (e) {
      console.error('[StorageProvider] removeFromHistory failed:', e);
    }
  }

  // AI & Recommendation
  async setTrackExcluded(trackId: string, excluded: boolean): Promise<void> {
    try {
      const track = await this.getTrack(trackId);
      if (track) {
        track.excludeFromRecs = excluded;
        await this.saveTrack(track);
      }
    } catch (e) {
      console.error('[StorageProvider] setTrackExcluded failed:', e);
    }
  }

  async getRecommendations(): Promise<Track[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/recommendations`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('[StorageProvider] getRecommendations failed:', e);
      return [];
    }
  }

  async migrateBatch(tracks: Track[], history: PlayHistory[], favorites: FavoriteGroup[]): Promise<any> {
    try {
      await fetch(`${API_BASE_URL}/storage/migrate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ tracks, history, favorites })
      });
    } catch (e) {
      console.error('[StorageProvider] migrateBatch failed:', e);
    }
  }

  async getRecentTracks(limit: number = 30): Promise<Track[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/recent?limit=${limit}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('[StorageProvider] getRecentTracks failed:', e);
      return [];
    }
  }

  async getGlobalStats(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/debug-stats`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('[StorageProvider] getGlobalStats failed:', e);
      return null;
    }
  }

  async adoptAnonymousData(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/adopt-anonymous`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('[StorageProvider] adoptAnonymousData failed:', e);
      return null;
    }
  }
}
