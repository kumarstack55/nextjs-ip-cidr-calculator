export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
export type Relation = "equal" | "contains" | "contained-by" | "adjacent" | "disjoint";
export type Broadcast = { status: "available"; address: bigint } | {
  status: "not-applicable"; reason: "point-to-point" | "host-route";
};
const LIMIT = 1n << 32n;

export function dotted(value: bigint): string {
  return [24n, 16n, 8n, 0n].map(shift => ((value >> shift) & 255n).toString()).join(".");
}

/** Immutable IPv4 value object. Invalid or unfinished text stays outside this class. */
export class Ipv4Cidr {
  readonly address: bigint;
  readonly prefix: number;

  private constructor(address: bigint, prefix: number) {
    this.address = address;
    this.prefix = prefix;
    Object.freeze(this);
  }

  static parse(input: string): Result<Ipv4Cidr> {
    const text = input.trim();
    if (!text) return { ok: false, reason: "CIDR を入力してください。" };
    if (text.includes(":")) return { ok: false, reason: "現在は IPv4 のみ対応しています。" };
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(text);
    if (!match) return { ok: false, reason: "192.168.0.0/24 の形式で入力してください。" };
    const octets = match.slice(1, 5).map(Number);
    if (octets.some(n => n > 255)) return { ok: false, reason: "各オクテットは 0〜255 で入力してください。" };
    const prefix = Number(match[5]);
    if (prefix > 32) return { ok: false, reason: "Prefix は 0〜32 で入力してください。" };
    return { ok: true, value: new Ipv4Cidr(octets.reduce((acc, n) => (acc << 8n) + BigInt(n), 0n), prefix) };
  }

  get addressCount() { return 1n << BigInt(32 - this.prefix); }
  get wildcard() { return this.addressCount - 1n; }
  get netmask() { return (LIMIT - 1n) ^ this.wildcard; }
  get networkAddress() { return this.address & this.netmask; }
  get endExclusive() { return this.networkAddress + this.addressCount; }
  get lastAddress() { return this.endExclusive - 1n; }
  get hostOffset() { return this.address - this.networkAddress; }
  get broadcast(): Broadcast {
    if (this.prefix === 31) return { status: "not-applicable", reason: "point-to-point" };
    if (this.prefix === 32) return { status: "not-applicable", reason: "host-route" };
    return { status: "available", address: this.lastAddress };
  }

  changePrefix(delta: -1 | 1): Result<Ipv4Cidr> {
    const prefix = this.prefix + delta;
    return prefix < 0 || prefix > 32
      ? { ok: false, reason: "Prefix は /0〜/32 の範囲です。" }
      : { ok: true, value: new Ipv4Cidr(this.address, prefix) };
  }

  moveSubnet(delta: -1 | 1): Result<Ipv4Cidr> {
    const address = this.address + BigInt(delta) * this.addressCount;
    return address < 0n || address >= LIMIT
      ? { ok: false, reason: "IPv4 アドレス空間の端です。" }
      : { ok: true, value: new Ipv4Cidr(address, this.prefix) };
  }

  moveHost(delta: -1 | 1): Result<Ipv4Cidr> {
    const address = this.address + BigInt(delta);
    return address < this.networkAddress || address >= this.endExclusive
      ? { ok: false, reason: delta < 0 ? "ネットワークの先頭です。" : "ネットワークの末尾です。" }
      : { ok: true, value: new Ipv4Cidr(address, this.prefix) };
  }

  relationTo(other: Ipv4Cidr): Relation {
    if (this.networkAddress === other.networkAddress && this.prefix === other.prefix) return "equal";
    if (this.networkAddress <= other.networkAddress && this.endExclusive >= other.endExclusive) return "contains";
    if (other.networkAddress <= this.networkAddress && other.endExclusive >= this.endExclusive) return "contained-by";
    if (this.endExclusive === other.networkAddress || other.endExclusive === this.networkAddress) return "adjacent";
    return "disjoint";
  }

  toString() { return `${dotted(this.address)}/${this.prefix}`; }
  toNetworkString() { return `${dotted(this.networkAddress)}/${this.prefix}`; }
}

/** Subtract and scale with integers before converting to screen coordinates. */
export function position(value: bigint, start: bigint, end: bigint, width: number): number {
  if (end <= start) return 0;
  return Number((value - start) * 1_000_000n / (end - start)) / 1_000_000 * width;
}
