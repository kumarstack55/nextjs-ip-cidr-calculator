import test from "node:test";
import assert from "node:assert/strict";
import { encodeEntries, decodeEntries } from "../src/lib/share.ts";

test("URL round trip preserves IDs, order, duplicates, blanks and arbitrary drafts", () => {
  const entries = [{ id: 7, name: "社内 🌐", input: "192.168.0.7/24" }, { id: 2, name: "社内 🌐", input: "192.168.0.7/24" }, { id: 9, name: "", input: "" }, { id: 10, name: "<test> & #", input: "編集中 % / # +" }];
  assert.deepEqual(decodeEntries(encodeEntries(entries)), entries);
  assert.match(encodeEntries(entries), /^#v2=[A-Za-z0-9_-]+$/);
  assert.equal(encodeEntries([]), "#v2=W10");
  assert.deepEqual(decodeEntries("#v1=" + encodeURIComponent('[[3,"192.168.0.1/24"]]')), [{ id: 3, name: "", input: "192.168.0.1/24" }]);
  assert.deepEqual(decodeEntries(encodeEntries([])), []);
  assert.equal(decodeEntries(""), null);
  assert.deepEqual(decodeEntries("#v2=" + Buffer.from('[[3,"192.168.0.1/24"]]').toString("base64url")), [{ id: 3, input: "192.168.0.1/24", name: "" }]);
});

test("malformed URLs and unsupported versions are rejected", () => {
  for (const hash of ["#v3=W10", "#v2=[]", "#v2=A", "#v2=_w", "#v2=", "#v1=%", "#v1={}", '#v1=[[1,"a"],[1,"b"]]', '#v1=[[0,"a"]]', '#v1=[[1,2]]']) assert.throws(() => decodeEntries(hash));
  assert.throws(() => encodeEntries([{ id: 1, name: "", input: "a".repeat(64_000) }]));
});
