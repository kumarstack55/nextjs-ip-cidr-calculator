export type SharedEntry = { id: number; input: string; name: string };
const MAX_HASH_LENGTH = 64_000;

/** Versioned, uncompressed JSON. IDs preserve labels and colors after deletions. */
export function encodeEntries(entries: SharedEntry[]): string {
  const json = JSON.stringify(entries.map(({ id, input, name }) => name ? [id, input, name] : [id, input]));
  const bytes = new TextEncoder().encode(json);
  const base64 = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""));
  const hash = `#v2=${base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  if (hash.length > MAX_HASH_LENGTH) throw new Error("入力が長すぎるため URL を更新できません。入力を短くするか CIDR を減らしてください。");
  return hash;
}

export function decodeEntries(hash: string): SharedEntry[] | null {
  if (!hash || hash.startsWith("#cidr-")) return null;
  if (!hash.startsWith("#v1=") && !hash.startsWith("#v2=")) throw new Error("この共有 URL の形式には対応していません。");
  if (hash.length > MAX_HASH_LENGTH) throw new Error("共有 URL が長すぎます。");
  try {
    const payload = hash.slice(4);
    let json: string;
    if (hash.startsWith("#v1=")) {
      json = decodeURIComponent(payload);
    } else {
      if (!/^[A-Za-z0-9_-]+$/.test(payload) || payload.length % 4 === 1) throw new Error();
      const bytes = Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0));
      json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) throw new Error();
    const ids = new Set<number>();
    return data.map(item => {
      if (!Array.isArray(item) || (item.length !== 2 && item.length !== 3) || !Number.isSafeInteger(item[0]) || item[0] < 1 || item[0] >= Number.MAX_SAFE_INTEGER || typeof item[1] !== "string" || (item.length === 3 && typeof item[2] !== "string") || ids.has(item[0])) throw new Error();
      ids.add(item[0]);
      return { id: item[0], input: item[1], name: item[2] ?? "" };
    });
  } catch {
    throw new Error("共有 URL を読み取れませんでした。初期サンプルを表示しています。入力を変更すると URL が更新されます。");
  }
}
