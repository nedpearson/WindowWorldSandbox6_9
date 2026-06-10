import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// In-memory store for idempotency keys / hashes
// Format: Map<string, { timestamp: number, response?: any }>
const idempotencyCache = new Map<string, { timestamp: number }>();

// Clean up cache every 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > 10000) { // Keep for 10 seconds max
      idempotencyCache.delete(key);
    }
  }
}, 60000);

/**
 * Idempotency Middleware
 * Protects POST/PUT/PATCH/DELETE endpoints from rapid double-clicks.
 * If an 'Idempotency-Key' header is present, it uses that.
 * Otherwise, it hashes the user ID + request path + request body.
 */
export function enforceIdempotency(req: Request, res: Response, next: NextFunction) {
  // Only apply to mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Allow webhooks and auth to bypass this generic middleware
  if (req.path.includes('/auth/') || req.path.includes('/webhooks/')) {
    return next();
  }

  let key = req.headers['idempotency-key'] as string;
  
  if (!key) {
    // Generate a hash based on the request
    // @ts-ignore - req.user injected by auth middleware
    const userId = req.user?.userId || req.ip;
    
    // Stringify body safely (ignoring circular refs if any, though express.json should be clean)
    const bodyStr = req.body ? JSON.stringify(req.body) : '';
    
    // Hash: Method + Path + User + Body
    const rawKey = `${req.method}:${req.path}:${userId}:${bodyStr}`;
    key = crypto.createHash('sha256').update(rawKey).digest('hex');
  } else {
    // Prefix the explicit key with user ID to prevent cross-user collision
    // @ts-ignore
    const userId = req.user?.userId || req.ip;
    key = `${userId}:${key}`;
  }

  const now = Date.now();
  const existing = idempotencyCache.get(key);

  if (existing) {
    // If we've seen this exact request in the last 5 seconds, reject as conflict
    if (now - existing.timestamp < 5000) {
      console.warn(`[Idempotency] Blocked duplicate request: ${req.method} ${req.path}`);
      return res.status(409).json({
        error: 'DuplicateRequest',
        message: 'A duplicate request is already being processed or was just completed. Please wait a moment.'
      });
    }
  }

  // Register the request
  idempotencyCache.set(key, { timestamp: now });

  next();
}
