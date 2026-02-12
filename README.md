## Redis CLI cheatsheet

### Connect (docker)
docker exec -it redislab-redis redis-cli

### Basic
PING
SET hello world
GET hello
DEL hello

### TTL
SET session:1 abc EX 60
TTL session:1

### Lists (queue)
LPUSH jobs:queue "job1"
BRPOP jobs:queue 0

### Sorted sets (leaderboard)
ZINCRBY leaderboard 1 veli
ZREVRANGE leaderboard 0 10 WITHSCORES
