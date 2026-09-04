import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export function setupRedisAdapter(io: Server): boolean {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

  if (redisUrl || process.env.USE_REDIS === 'true') {
    try {
      console.log('⚡ Initializing Redis Adapter for Horizontal WebSocket Scaling...');
      const pubClient = redisUrl ? new Redis(redisUrl) : new Redis({ host: redisHost, port: redisPort });
      const subClient = pubClient.duplicate();

      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis Adapter configured successfully! Ready for multi-node cluster fanout.');
      return true;
    } catch (err) {
      console.warn('⚠️ Could not connect to Redis. Running in single-node in-memory mode.', err);
      return false;
    }
  } else {
    console.log('ℹ️ Running in single-instance WebSocket mode. Set REDIS_URL or USE_REDIS=true for Redis Pub/Sub multi-node scaling.');
    return false;
  }
}
