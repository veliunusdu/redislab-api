export const Keys = {
  cache: {
    user: (id: string) => `cache:user:${id}`,
  },
  rl: {
    apiKey: (keyId: string) => `rl:apikey:${keyId}`,
  },
  sess: {
    session: (sid: string) => `sess:${sid}`,
    userSessions: (userId: string) => `sess:user:${userId}`,
  },
  jobs: {
    queue: 'jobs:queue',
    dlq: 'jobs:dlq',
  },
} as const;
