import { PrismaClient } from '@prisma/client';
import { Track, FavoriteGroup, PlayHistory } from '@music-player/shared';

const prisma = new PrismaClient();

class NeonDB {
  constructor() {
    console.log('[NeonDB] Initialized with Prisma');
  }

  // Tracks
  async saveTrack(track: Track) {
    try {
      return await prisma.track.upsert({
        where: { id: track.id },
        update: {
          title: track.title,
          artist: track.artist,
          duration: track.duration,
          coverUrl: track.coverUrl,
          url: track.url,
          source: track.source,
          tags: track.tags || [],
        },
        create: {
          id: track.id,
          title: track.title,
          artist: track.artist,
          duration: track.duration,
          coverUrl: track.coverUrl,
          url: track.url,
          source: track.source,
          tags: track.tags || [],
        },
      });
    } catch (error) {
      console.error('[NeonDB] saveTrack error:', error);
    }
  }

  async getTrack(id: string) {
    return await prisma.track.findUnique({ where: { id } });
  }

  async updateTrackTags(trackId: string, tags: string[]) {
    try {
      return await prisma.track.update({
        where: { id: trackId },
        data: { tags },
      });
    } catch (error) {
      console.error('[NeonDB] updateTrackTags error:', error);
    }
  }

  async getAllTags() {
    try {
      const tracks = await prisma.track.findMany({
        select: { tags: true },
      });
      const allTags = new Set<string>();
      tracks.forEach(t => t.tags.forEach(tag => allTags.add(tag)));
      return Array.from(allTags).sort();
    } catch (error) {
      console.error('[NeonDB] getAllTags error:', error);
      return [];
    }
  }

  async getTracksByTag(tag: string) {
    return await prisma.track.findMany({
      where: { tags: { has: tag } },
    });
  }

  // Favorites
  async getFavoriteGroups(userId: string) {
    try {
      console.log(`[NeonDB] Fetching favorites for user: ${userId}`);
      const groups = await prisma.favoriteGroup.findMany({
        where: { userId },
        include: { 
          favorites: {
            include: { track: true }
          }
        }
      });

      // Map back to FavoriteGroup shared type
      return groups.map(g => ({
        id: g.id,
        name: g.name,
        tracks: g.favorites.map(f => f.track) as any
      }));
    } catch (error) {
      console.error('[NeonDB] getFavoriteGroups error:', error);
      return [];
    }
  }

  async saveFavoriteGroup(userId: string, group: FavoriteGroup) {
    try {
      // Delete existing group and its favorites (regardless of previous owner)
      // This ensures clean ownership transfer during migration
      await prisma.favorite.deleteMany({ where: { groupId: group.id } });
      await prisma.favoriteGroup.deleteMany({ where: { id: group.id } });

      // Re-create with correct userId
      const dbGroup = await prisma.favoriteGroup.create({
        data: {
          id: group.id,
          name: group.name,
          userId: userId
        }
      });

      // Add tracks
      for (const track of group.tracks) {
        await this.saveTrack(track);
        await prisma.favorite.create({
          data: {
            groupId: dbGroup.id,
            trackId: track.id
          }
        });
      }
      return dbGroup;
    } catch (error) {
      console.error('[NeonDB] saveFavoriteGroup error:', error);
    }
  }

  async deleteFavoriteGroup(id: string) {
    try {
      return await prisma.favoriteGroup.delete({ where: { id } });
    } catch (error) {
      console.error('[NeonDB] deleteFavoriteGroup error:', error);
    }
  }

  // History
  async getHistory(userId: string, limit: number = 200) {
    try {
      console.log(`[NeonDB] Fetching history for user: ${userId}`);
      const history = await prisma.history.findMany({
        where: { userId },
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: { track: true }
      });
      return history.map(h => ({
        trackId: h.trackId,
        playedAt: h.timestamp.getTime(),
        track: h.track
      }));
    } catch (error) {
      console.error('[NeonDB] getHistory error:', error);
      return [];
    }
  }

  async addHistory(userId: string, trackId: string, track?: Track) {
    try {
      if (track) await this.saveTrack(track);
      
      return await prisma.history.create({
        data: {
          userId,
          trackId,
        }
      });
    } catch (error) {
      console.error('[NeonDB] addHistory error:', error);
    }
  }

  async removeFromHistory(userId: string, trackId: string) {
    try {
      return await prisma.history.deleteMany({
        where: { userId, trackId }
      });
    } catch (error) {
      console.error('[NeonDB] removeFromHistory error:', error);
    }
  }

  async bulkSave(userId: string, tracks: Track[], history: PlayHistory[], favorites: FavoriteGroup[]) {
    try {
      console.log(`[NeonDB] bulkSave starting for user: ${userId}. Tracks: ${tracks.length}, History: ${history.length}, Favorites: ${favorites.length}`);
      
      // 0. Ensure user exists
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { 
          id: userId,
          email: `${userId}@migrated.local`,
        }
      });

      // 1. Tracks (Global) - Use parallel processing in chunks to avoid overwhelming the DB
      const CHUNK_SIZE = 20;
      for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
        const chunk = tracks.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(t => this.saveTrack(t)));
        console.log(`[NeonDB] Migrated tracks chunk ${i / CHUNK_SIZE + 1}...`);
      }

      // 2. History (User specific)
      await prisma.history.deleteMany({ where: { userId } });
      
      const historyChunks = [];
      for (let i = 0; i < history.length; i += CHUNK_SIZE) {
        historyChunks.push(history.slice(i, i + CHUNK_SIZE));
      }

      for (const chunk of historyChunks) {
        await Promise.all(chunk.map(async (h) => {
          try {
            await prisma.history.create({
              data: {
                userId,
                trackId: h.trackId,
                timestamp: new Date(h.playedAt)
              }
            });
          } catch (e) {}
        }));
      }

      // 3. Favorites (User specific)
      for (const g of favorites) {
        await this.saveFavoriteGroup(userId, g);
      }
      
      console.log(`[NeonDB] bulkSave completed for user: ${userId}`);
    } catch (error) {
      console.error('[NeonDB] bulkSave error:', error);
      throw error;
    }
  }

  // AI & Recommendations
  async getRecommendations(userId: string): Promise<Track[]> {
    // Basic recommendation: Most played tags/artists from user's history
    try {
      const history = await prisma.history.findMany({
        where: { userId },
        take: 100,
        include: { track: true }
      });

      const tagCounts: Record<string, number> = {};
      history.forEach(h => {
        h.track.tags?.forEach(t => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      });

      const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      if (topTag) {
        return await prisma.track.findMany({
          where: { tags: { has: topTag } },
          take: 30
        }) as any;
      }

      return await prisma.track.findMany({ take: 30 }) as any;
    } catch (error) {
      return [];
    }
  }

  async getRecentTracks(userId: string, limit: number = 30): Promise<Track[]> {
    try {
      const history = await prisma.history.findMany({
        where: { userId },
        distinct: ['trackId'],
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: { track: true }
      });
      return history.map(h => h.track) as any;
    } catch (error) {
      return [];
    }
  }

  async getGlobalStats(userId?: string) {
    try {
      const [userCount, trackCount, historyCount, favoriteCount] = await Promise.all([
        prisma.user.count(),
        prisma.track.count(),
        prisma.history.count(),
        prisma.favoriteGroup.count(),
      ]);

      let userStats = null;
      if (userId) {
        const [uHistory, uFavorites] = await Promise.all([
          prisma.history.count({ where: { userId } }),
          prisma.favoriteGroup.count({ where: { userId } }),
        ]);
        userStats = {
          history: uHistory,
          favorites: uFavorites
        };
      }

      return {
        global: {
          users: userCount,
          tracks: trackCount,
          history: historyCount,
          favorites: favoriteCount,
        },
        user: userStats,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('[NeonDB] getGlobalStats error:', error);
      throw error;
    }
  }

  async adoptAnonymousData(newUserId: string) {
    try {
      console.log(`[NeonDB] Adopting anonymous data for user: ${newUserId}`);
      
      // 1. History
      const historyUpdate = await prisma.history.updateMany({
        where: { userId: 'anonymous' },
        data: { userId: newUserId }
      });
      
      // 2. Favorite Groups
      const favoritesUpdate = await prisma.favoriteGroup.updateMany({
        where: { userId: 'anonymous' },
        data: { userId: newUserId }
      });

      console.log(`[NeonDB] Adoption complete. History: ${historyUpdate.count}, Groups: ${favoritesUpdate.count}`);

      return {
        historyAdopted: historyUpdate.count,
        favoritesAdopted: favoritesUpdate.count
      };
    } catch (error) {
      console.error('[NeonDB] adoptAnonymousData error:', error);
      throw error;
    }
  }
}

export const localDB = new NeonDB();
