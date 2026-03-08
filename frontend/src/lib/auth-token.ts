// Token store en mémoire (pas localStorage — sécurité XSS)
let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(t: string | null): void {
  _accessToken = t;
}
