import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const LOG_KEY = "logs:app";
const MAX_ENTRIES = 10_000;

type Level = "info" | "warn" | "error" | "debug";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });
    redis.on("error", () => {
      redis = null;
    });
    return redis;
  } catch {
    return null;
  }
}

function consoleFn(level: Level): (...args: any[]) => void {
  if (level === "error") return console.error.bind(console);
  if (level === "warn") return console.warn.bind(console);
  if (level === "debug") return console.debug.bind(console);
  return console.log.bind(console);
}

async function write(level: Level, message: string, meta?: Record<string, any>): Promise<void> {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  });

  consoleFn(level)(`[${level.toUpperCase()}]`, message, meta ?? "");

  const r = getRedis();
  if (!r) return;

  try {
    await r.rpush(LOG_KEY, entry);
    await r.ltrim(LOG_KEY, -MAX_ENTRIES, -1);
  } catch {
    // Redis unavailable — already logged to console above
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, any>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, any>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, any>) => write("error", message, meta),
  debug: (message: string, meta?: Record<string, any>) => write("debug", message, meta),
};

export function httpLoggerMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      const level: Level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      write(level, `${req.method} ${req.path}`, {
        status: res.statusCode,
        ms,
        ip: req.ip,
      }).catch(() => {});
    });
    next();
  };
}
