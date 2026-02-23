export const Keys = {
  cache: {
    user: (id: string) => `cache:user:${id}`,
  },
  rl: {
    apiKey: (keyId: string) => `rl:apikey:${keyId}`,
  },
  sess: {
    byId: (sid: string) => `sess:${sid}`,
    userSet: (userId: string) => `sess:user:${userId}`,  // Set of active sids per user
    revoked: (sid: string) => `sess:revoked:${sid}`,    // blocklist entry
  },
  jobs: {
    queue: 'jobs:queue',
    dlq: 'jobs:dlq',
  },
  lock: {
    userRebuild: (id: string) => `lock:cache:user:${id}`,
  },
  metrics: {
    globalMinute: (minute: string) => `m:${minute}`,
    endpointMinute: (endpoint: string, minute: string) => `m:ep:${endpoint}:${minute}`,
  },
} as const;
