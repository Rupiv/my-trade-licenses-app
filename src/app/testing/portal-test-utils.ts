import { Route } from '@angular/router';
import { routes } from '../app.routes';

/** Unsigned JWT with the given role claim, valid for one hour (the UI only decodes tokens). */
export function fakeToken(role: string, sub = 101): string {
  const encode = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  const payload = { sub, role, exp: Math.floor(Date.now() / 1000) + 3600 };
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.sig`;
}

/** Stores a token where TokenService reads it. */
export function signInAs(role: string): void {
  ensureWebStorage();
  localStorage.setItem('access_token', fakeToken(role));
}

export function signOutAll(): void {
  ensureWebStorage();
  localStorage.clear();
  sessionStorage.clear();
}

/**
 * Installs in-memory localStorage / sessionStorage where the test runtime has none (Node's own
 * `localStorage` global is undefined without --localstorage-file and hides the DOM one).
 */
export function ensureWebStorage(): void {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    if (!(globalThis as any)[name]) {
      Object.defineProperty(globalThis, name, { value: createMemoryStorage(), configurable: true, writable: true });
    }
  }
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => void store.delete(k),
    setItem: (k, v) => void store.set(k, String(v)),
  };
}

/**
 * True when `url` (path only) matches a declared route rather than the '**' fallback that sends
 * unknown links back to Home. Handles nested children and `:param` segments.
 */
export function isDeclaredRoute(url: string): boolean {
  const segments = url.split(/[?#]/)[0].split('/').filter(Boolean);
  return matches(routes, segments);
}

function matches(config: Route[], segments: string[]): boolean {
  if (segments.length === 0) {
    return config.some((r) => r.path === '');
  }
  return config.some((r) => {
    if (r.path === undefined || r.path === '**') {
      return false;
    }
    const parts = r.path.split('/').filter(Boolean);
    if (parts.length > segments.length) {
      return false;
    }
    const prefixOk = parts.every((p, i) => p.startsWith(':') || p === segments[i]);
    if (!prefixOk) {
      return false;
    }
    const rest = segments.slice(parts.length);
    if (rest.length === 0) {
      return !!(r.component || r.loadComponent || r.children?.some((c) => c.path === ''));
    }
    return !!r.children && matches(r.children, rest);
  });
}
