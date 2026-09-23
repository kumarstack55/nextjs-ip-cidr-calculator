"use client";

import { useEffect, useId, useState } from "react";
import { dotted, Ipv4Cidr, position, type Result } from "../lib/cidr";

import { useSharedEntries } from "./use-shared-entries";

function focusEntry(id: number) {
  document.getElementById(`cidr-${id}`)?.scrollIntoView({ block: "nearest" });
  document.getElementById(`input-${id}`)?.focus({ preventScroll: true });
}

type Entry = { id: number; input: string; name: string };
type ValidEntry = Entry & { cidr: Ipv4Cidr };
const colors = ["#2563a6", "#8b458e", "#26735c", "#a34730", "#6657aa", "#376d7d", "#85631d"];
const color = (id: number) => colors[(id - 1) % colors.length];
function label(id: number): string {
  let result = "";
  for (let n = id; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return `#${result}`;
}
const initial = (): Entry[] => ["192.168.0.0/23", "192.168.0.0/24", "192.168.1.0/24"].map((input, index) => ({ id: index + 1, input, name: `network${index + 1}` }));

function CopyButton({ value, name }: { value: string; name: string }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [message]);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setMessage("Copied"); }
    catch { setMessage("コピーできませんでした。値を選択してコピーしてください。"); }
  }
  return <span className="copy"><button type="button" aria-label={`${message === "Copied" ? "Copied" : "Copy"} ${name}`} onClick={copy}>{message === "Copied" ? "Copied" : "Copy"}</button><span role="status">{message === "Copied" ? "" : message}</span></span>;
}

function RangeChart({ entries }: { entries: ValidEntry[] }) {
  if (!entries.length) return <section className="comparison"><h2>アドレス範囲の可視化</h2><p className="muted">CIDR を入力すると比較図が表示されます。</p></section>;
  const start = entries.reduce((n, e) => e.cidr.networkAddress < n ? e.cidr.networkAddress : n, entries[0].cidr.networkAddress);
  const end = entries.reduce((n, e) => e.cidr.endExclusive > n ? e.cidr.endExclusive : n, entries[0].cidr.endExclusive);
  return <section className="comparison" aria-labelledby="comparison-title">
    <div className="section-heading"><h2 id="comparison-title">アドレス範囲の可視化</h2></div>
    <div className="chart-scroll"><div className="chart-grid"><div className="axis"><code>{dotted(start)}</code><code>{dotted(end - 1n)}</code></div>
    <div className="chart-rows">{entries.map(entry => {
      const x = position(entry.cidr.networkAddress, start, end, 1000);
      const width = position(entry.cidr.endExclusive, start, end, 1000) - x;
      const marker = Math.min(997, Math.max(3, position(entry.cidr.address, start, end, 1000)));
      const tiny = width < 2;
      return <div className="chart-row" key={entry.id}>
        <button className="chart-id text-button" onClick={() => focusEntry(entry.id)} style={{ color: color(entry.id) }} aria-label={`${label(entry.id)} の入力へ`}>{label(entry.id)}</button>
        <svg viewBox="0 0 1000 30" preserveAspectRatio="none" role="img" aria-label={`${label(entry.id)}: ${dotted(entry.cidr.networkAddress)} から ${dotted(entry.cidr.lastAddress)}、IP Address ${dotted(entry.cidr.address)}${tiny ? "。表示幅未満の範囲" : ""}`}>
          <path d="M0 15 H1000" stroke="#dedede" />
          {[0, 250, 500, 750, 1000].map(tick => <path key={tick} d={`M${tick} 0 V30`} stroke="#e5e5e5" />)}
          <rect x={tiny ? Math.min(x, 998) : x} y="7" width={tiny ? 2 : width} height="16" fill={color(entry.id)} />
          {!tiny && <path d={`M${marker} 2 V28`} stroke="white" strokeWidth="5" />}
          <path d={`M${marker} 2 V${tiny ? 6 : 28}`} stroke="#171717" strokeWidth="2" />
        </svg>
        <span className="chart-caption" title={entry.name || undefined}>{entry.name && <span className="chart-name">{entry.name}</span>}<code>{entry.cidr.toNetworkString()}</code> <span>({entry.cidr.addressCount.toLocaleString()}アドレス)</span></span>
        {tiny && <small className="muted">⚠️帯が小さすぎるため、描画すべき幅よりも大きな幅で可視化されています。</small>}
      </div>;
    })}</div></div></div>
    <p className="muted">帯の長さは CIDR のアドレス数を示します。黒い縦線は CIDR 内の IP Address 部を示します。</p>
  </section>;
}

function Binary({ value, prefix }: { value: bigint; prefix: number }) {
  const bits = value.toString(2).padStart(32, "0");
  return <code className="binary" aria-label={bits}>{Array.from(bits).map((bit, index) => <span key={index} className={`${index > 0 && index % 8 === 0 ? "octet " : ""}${index === prefix ? "prefix-boundary" : ""}`}>{bit}</span>)}{prefix === 32 && <span className="prefix-boundary" />}</code>;
}

function Details({ cidr }: { cidr: Ipv4Cidr }) {
  const broadcast = cidr.broadcast;
  const rows: [string, bigint | null][] = [["IP Address", cidr.address], ["Network Address", cidr.networkAddress], ["Netmask", cidr.netmask], ["Wildcard", cidr.wildcard], ["Broadcast address", broadcast.status === "available" ? broadcast.address : null]];
  return <>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="計算結果（横スクロール可能）"><table><thead><tr><th scope="col">項目</th><th scope="col">ドット表記</th><th scope="col">数値表現</th><th scope="col">バイナリ表現</th></tr></thead><tbody>{rows.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value === null ? "該当なし" : <div className="value-copy"><code>{dotted(value)}</code><CopyButton key={value.toString()} value={dotted(value)} name={name} /></div>}</td><td><code>{value === null ? "—" : value.toString()}</code></td><td>{value === null ? "—" : <Binary value={value} prefix={cidr.prefix} />}</td></tr>)}</tbody></table></div>
    {broadcast.status === "not-applicable" && <p className="explanation">{broadcast.reason === "point-to-point" ? <> <strong>Broadcast：該当なし。</strong> /31 はポイントツーポイントリンクとして扱います。2 つのアドレスを両端で使用するため、このサブネットの directed broadcast はありません。 <a href="https://www.rfc-editor.org/rfc/rfc3021.html#section-2.2">RFC 3021 §2.2</a></> : <><strong>Broadcast：該当なし。</strong> /32 は単一アドレスのホストルートとして扱い、この計算機ではサブネットの Broadcast を表示しません。関連仕様：<a href="https://www.rfc-editor.org/rfc/rfc4632.html#section-3.1">RFC 4632 §3.1（ホストルート）</a></>}</p>}
  </>;
}

function Operation({ title, previous, next, onChange }: { title: string; previous: Result<Ipv4Cidr>; next: Result<Ipv4Cidr>; onChange: (value: string) => void }) {
  const tooltipId = useId();
  return <div className="operation"><strong>{title}</strong>{([previous, next] as const).map((result, index) => {
    const name = `${title} ${index === 0 ? "Prev" : "Next"}`;
    const reasonId = `${tooltipId}-${index}`;
    return <span className="operation-button" key={index} tabIndex={!result.ok ? 0 : undefined} aria-label={!result.ok ? name : undefined} aria-describedby={!result.ok ? reasonId : undefined}>
      <button disabled={!result.ok} aria-label={name} aria-describedby={!result.ok ? reasonId : undefined} onClick={() => { if (result.ok) onChange(result.value.toString()); }}>{title === "Subnet" ? (index === 0 ? "Prev" : "Next") : (index === 0 ? "−" : "＋")}</button>
      {!result.ok && <span className="operation-tooltip" id={reasonId} role="tooltip">{result.reason}</span>}
    </span>;
  })}</div>;
}

export default function Calculator() {
  const { entries, setEntries, urlError } = useSharedEntries(initial);
  const [focusId, setFocusId] = useState<number | null>(null);
  const parsed = entries.map(entry => ({ ...entry, result: Ipv4Cidr.parse(entry.input) }));
  const valid = parsed.flatMap(entry => entry.result.ok ? [{ ...entry, cidr: entry.result.value }] : []);
  function update(id: number, input: string) { setEntries(current => current.map(entry => entry.id === id ? { ...entry, input } : entry)); }
  function rename(id: number, name: string) { setEntries(current => current.map(entry => entry.id === id ? { ...entry, name } : entry)); }
  function add() { const id = Math.max(0, ...entries.map(entry => entry.id)) + 1; setEntries(current => [...current, { id, input: "", name: "" }]); setFocusId(id); }
  return <main><header><h1>CIDR Calculator</h1><p className="muted">CIDR を計算し、アドレス範囲を比較できます。計算はブラウザ上で行われ、データは外部に送信されません。URLを共有すると相手に計算を共有できます。動作の保証はしませんが、安心してご利用ください。</p></header>
    <section className="inputs" aria-labelledby="inputs-title">
    <h2 id="inputs-title">CIDR一覧</h2>
    {urlError && <p className="error" role="alert">{urlError}</p>}
    <div className="cards">{parsed.map(entry => {
      const cidr = entry.result.ok ? entry.result.value : null;
      const errorId = `error-${entry.id}`;
      return <section className="card" id={`cidr-${entry.id}`} key={entry.id} aria-labelledby={`title-${entry.id}`}>
        <h3 className="entry-id" id={`title-${entry.id}`} style={{ color: color(entry.id) }}>{label(entry.id)}</h3>
        <input className="name-input" aria-label={`名前 ${label(entry.id)}`} placeholder="名前（任意）" value={entry.name} onChange={event => rename(entry.id, event.target.value)} />
        <div className="input-row"><label className="sr-only" htmlFor={`input-${entry.id}`}>CIDR {label(entry.id)}</label><input id={`input-${entry.id}`} ref={element => { if (element && focusId === entry.id) { element.focus(); setFocusId(null); } }} value={entry.input} onChange={event => update(entry.id, event.target.value)} placeholder="192.168.0.0/24" spellCheck={false} autoComplete="off" aria-invalid={!!entry.input && !cidr} aria-describedby={!cidr ? errorId : undefined} /></div>
        {!cidr && <p id={errorId} className={entry.input ? "error" : "muted"}>{!entry.result.ok && entry.result.reason} {entry.input && "このカードは比較図から除外されています。"}</p>}
        {cidr && <><div className="operations"><Operation title="Prefix" previous={cidr.changePrefix(-1)} next={cidr.changePrefix(1)} onChange={value => update(entry.id, value)} /><Operation title="Subnet" previous={cidr.moveSubnet(-1)} next={cidr.moveSubnet(1)} onChange={value => update(entry.id, value)} /><Operation title="Host" previous={cidr.moveHost(-1)} next={cidr.moveHost(1)} onChange={value => update(entry.id, value)} /></div>
          </>}
        <button className="delete-entry" aria-label={`${label(entry.id)} を削除`} onClick={() => setEntries(current => current.filter(e => e.id !== entry.id))}>削除</button>
      </section>;
    })}</div>
    <div className="toolbar"><button onClick={add}>＋ CIDR を追加</button></div>
    </section>
    <RangeChart entries={valid} />
    <section className="address-details" aria-labelledby="details-title">
      <h2 id="details-title">詳細</h2>
      <div className="details-list">{valid.map(entry => <section className="detail-card" key={entry.id} aria-labelledby={`detail-title-${entry.id}`}>
        <div className="card-heading"><h3 id={`detail-title-${entry.id}`}><span style={{ color: color(entry.id) }}>{label(entry.id)}</span>{entry.name && <span className="detail-name">{entry.name}</span>}<code>{entry.cidr.toString()}</code><CopyButton key={entry.cidr.toString()} value={entry.cidr.toString()} name={`CIDR ${label(entry.id)}`} /></h3><button className="text-button" onClick={() => focusEntry(entry.id)}>入力へ</button></div>
        <p className="summary"><code>{dotted(entry.cidr.networkAddress)} ～ {dotted(entry.cidr.lastAddress)}</code><span>{entry.cidr.addressCount.toLocaleString()} アドレス</span></p>
        <Details cidr={entry.cidr} />
      </section>)}</div>
      {!valid.length && <p className="muted">有効な CIDR を入力すると詳細が表示されます。</p>}
    </section>
  </main>;
}
