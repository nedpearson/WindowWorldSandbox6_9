// ── Mapbox token resolution (runtime-safe, no build-time baking required) ────
// Extracted to a separate file so it can be exported without breaking Vite HMR.
// Priority:
//   1. localStorage override (dev convenience)
//   2. Vite build-time env (works locally with .env)
//   3. Runtime /api/config/public fetch (works on Railway)
//   4. Empty string → "Map Setup Required" shown

let _cachedToken: string | null = null;

export async function resolveMapboxToken(): Promise<string> {
  if (_cachedToken !== null) return _cachedToken;

  // 0. Try local override first (highest priority)
  const localOverride = localStorage.getItem('WWA_MAPBOX_TOKEN');
  if (localOverride && localOverride.startsWith('pk.')) {
    _cachedToken = localOverride;
    return localOverride;
  }

  // 1. Try Vite build-time env var (Vite statically replaces import.meta.env.VITE_* at build time)
  // NOTE: must use the exact pattern import.meta.env.VITE_* — as any cast breaks static substitution
  const viteToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined;
  if (viteToken && viteToken.startsWith('pk.')) {
    _cachedToken = viteToken;
    return viteToken;
  }

  // 2. Try runtime server config (always works on Railway if var is set)
  try {
    const res = await fetch('/api/config/public');
    if (res.ok) {
      const data = await res.json() as { mapboxToken?: string };
      if (data.mapboxToken && data.mapboxToken.startsWith('pk.')) {
        _cachedToken = data.mapboxToken;
        return data.mapboxToken;
      }
    }
  } catch {
    // ignore — no mapbox available
  }

  _cachedToken = '';
  return '';
}
