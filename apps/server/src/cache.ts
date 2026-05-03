import NodeCache from 'node-cache';

// 앱 전체 공유 캐시 인스턴스 (TTL 기본 10분)
export const cache = new NodeCache({ stdTTL: 600 });
