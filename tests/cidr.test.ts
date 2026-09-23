import test from "node:test";
import assert from "node:assert/strict";
import { dotted, Ipv4Cidr, position, type Result } from "../src/lib/cidr.ts";

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}
const parse = (text: string) => unwrap(Ipv4Cidr.parse(text));

test("initial samples have exact sizes, containment and adjacency", () => {
  const a = parse("192.168.0.0/23"), b = parse("192.168.0.0/24"), c = parse("192.168.1.0/24");
  assert.equal(a.addressCount, 512n);
  assert.equal(b.addressCount, 256n);
  assert.equal(a.relationTo(b), "contains");
  assert.equal(c.relationTo(a), "contained-by");
  assert.equal(b.relationTo(c), "adjacent");
  assert.equal(b.relationTo(parse("192.168.0.42/24")), "equal");
  assert.equal(b.relationTo(parse("10.0.0.0/8")), "disjoint");
});

test("input host bits survive calculation and subnet/prefix operations", () => {
  const cidr = parse("192.168.0.200/24");
  assert.equal(dotted(cidr.networkAddress), "192.168.0.0");
  assert.equal(dotted(cidr.netmask), "255.255.255.0");
  assert.equal(dotted(cidr.wildcard), "0.0.0.255");
  assert.equal(dotted(cidr.lastAddress), "192.168.0.255");
  assert.equal(cidr.address, 3232235720n);
  assert.equal(unwrap(cidr.moveSubnet(1)).toString(), "192.168.1.200/24");
  assert.equal(unwrap(cidr.changePrefix(1)).toNetworkString(), "192.168.0.128/25");
  assert.equal(unwrap(cidr.moveHost(-1)).toString(), "192.168.0.199/24");
  assert.equal(cidr.toString(), "192.168.0.200/24");
  assert.equal(Object.isFrozen(cidr), true);
});

test("operations stop at boundaries without wrapping", () => {
  assert.equal(parse("0.0.0.0/0").changePrefix(-1).ok, false);
  assert.equal(parse("0.0.0.0/0").moveSubnet(1).ok, false);
  assert.equal(parse("0.0.0.0/24").moveSubnet(-1).ok, false);
  assert.equal(parse("255.255.255.255/24").moveSubnet(1).ok, false);
  assert.equal(parse("192.168.0.0/24").moveHost(-1).ok, false);
  assert.equal(parse("192.168.0.255/24").moveHost(1).ok, false);
  const single = parse("255.255.255.255/32");
  assert.equal(single.changePrefix(1).ok, false);
  assert.equal(single.moveHost(-1).ok, false);
  assert.equal(single.moveHost(1).ok, false);
});

test("/0, /31 and /32 retain exact ranges and broadcast semantics", () => {
  const all = parse("255.255.255.255/0");
  assert.equal(all.addressCount, 4294967296n);
  assert.equal(all.endExclusive, 4294967296n);
  assert.equal(all.networkAddress, 0n);
  assert.deepEqual(all.broadcast, { status: "available", address: 4294967295n });
  assert.deepEqual(parse("10.0.0.1/31").broadcast, { status: "not-applicable", reason: "point-to-point" });
  assert.equal(unwrap(parse("10.0.0.0/31").moveHost(1)).toString(), "10.0.0.1/31");
  assert.deepEqual(parse("10.0.0.1/32").broadcast, { status: "not-applicable", reason: "host-route" });
});

test("invalid text never creates a CIDR", () => {
  for (const value of ["", "192.168.", "192.168.0.1", "256.0.0.1/24", "1.2.3.4/33", "1.2.3.4/-1", "1.2.3.4/1.5", "::1/128", "1.2.3.4/24extra"]) {
    assert.equal(Ipv4Cidr.parse(value).ok, false, value);
  }
  assert.equal(parse(" 192.168.0.1/24 ").toString(), "192.168.0.1/24");
});

test("all prefixes form aligned ranges containing their input", () => {
  for (let prefix = 0; prefix <= 32; prefix++) {
    for (const ip of ["0.0.0.0", "128.10.255.3", "255.255.255.255"]) {
      const cidr = parse(`${ip}/${prefix}`);
      assert.ok(cidr.networkAddress <= cidr.address && cidr.address < cidr.endExclusive);
      assert.equal(cidr.networkAddress % cidr.addressCount, 0n);
      assert.equal(cidr.netmask ^ cidr.wildcard, 4294967295n);
      const next = cidr.moveSubnet(1);
      if (next.ok) assert.equal(unwrap(next.value.moveSubnet(-1)).toString(), cidr.toString());
    }
  }
});

test("screen projection preserves local positions of large integers", () => {
  const start = 1n << 120n;
  assert.equal(position(start + 128n, start, start + 256n, 1000), 500);
  assert.equal(position(start + 256n, start, start + 256n, 1000), 1000);
});
