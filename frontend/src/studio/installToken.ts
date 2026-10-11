/** Random 256-bit install id. It is not derived from the device, network, account, or location. */
const INSTALL_STORAGE_KEY = "footwork-install";
const INSTALL_TOKEN = /^[0-9a-f]{64}$/;

let pageToken: string | null = null;

export function installToken(storage: Pick<Storage, "getItem" | "setItem"> = localStorage): string {
  try {
    const existing = storage.getItem(INSTALL_STORAGE_KEY);
    if (existing && INSTALL_TOKEN.test(existing)) return existing;
    const token = randomInstallToken();
    storage.setItem(INSTALL_STORAGE_KEY, token);
    if (storage.getItem(INSTALL_STORAGE_KEY) === token) return token;
  } catch {
    // Storage can be blocked. One page token still avoids a new id on every submit.
  }
  pageToken ??= randomInstallToken();
  return pageToken;
}

function randomInstallToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
