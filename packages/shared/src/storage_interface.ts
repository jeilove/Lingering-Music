export interface Track {
  id: string; // MusicBrainz Recording ID or yt_ID
  title: string;
  artist: string;
  album: string;
  duration: number | null; // in seconds
  coverUrl: string | null;
  releaseYear: number | string | null;
  tags?: string[];
  url?: string | null;
  source?: string;
  excludeFromRecs?: boolean;
}

export interface SearchCache {
  query: string;
  results: Track[];
  createdAt: number;
}

export interface FavoriteGroup {
  id: string;
  name: string;
  tracks: Track[];
}

export interface PlayHistory {
  trackId: string;
  playedAt: number;
}

export interface Storage {
  // Tracks
  saveTrack(track: Track): Promise<void>;
  getTrack(id: string): Promise<Track | null>;
  updateTrackTags(trackId: string, tags: string[]): Promise<void>;
  getAllTags(): Promise<string[]>;
  getTracksByTag(tag: string): Promise<Track[]>;

  // Favorites
  getFavoriteGroups(): Promise<FavoriteGroup[]>;
  saveFavoriteGroup(group: FavoriteGroup): Promise<void>;
  deleteFavoriteGroup(id: string): Promise<void>;
  renameFavoriteGroup(id: string, newName: string): Promise<void>;

  // History
  getHistory(limit?: number): Promise<PlayHistory[]>;
  addHistory(trackId: string): Promise<void>;
  getRecentTracks(limit?: number): Promise<Track[]>;
  removeFromHistory(trackId: string): Promise<void>;

  // AI & Recommendation
  getRecommendations(): Promise<Track[]>;
  setTrackExcluded(trackId: string, excluded: boolean): Promise<void>;

  // Sync / General
  init(): Promise<void>;
  sync?(): Promise<void>;
}
