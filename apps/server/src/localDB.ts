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
      // 1. Upsert the group
      const dbGroup = await prisma.favoriteGroup.upsert({
        where: { id: group.id },
        update: { name: group.name },
        create: { 
          id: group.id,
          name: group.name,
          userId: userId
        }
      });

      // 2. Sync tracks (Delete and Re-add for simplicity in this version)
      await prisma.favorite.deleteMany({ where: { groupId: dbGroup.id } });
      
      for (const track of group.tracks) {
        await this.saveTrack(track); // Ensure track exists
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
      // 1. Tracks
      for (const t of tracks) {
        await this.saveTrack(t);
      }

      // 2. History
      for (const h of history) {
        await prisma.history.create({
          data: {
            userId,
            trackId: h.trackId,
            timestamp: new Date(h.playedAt)
          }
        });
      }

      // 3. Favorites
      for (const g of favorites) {
        await this.saveFavoriteGroup(userId, g);
      }
    } catch (error) {
      console.error('[NeonDB] bulkSave error:', error);
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
}

export const localDB = new NeonDB();
ks[id])
      .filter((t): t is Track => !!t);
  }
}

export const localDB = new LocalDB();
