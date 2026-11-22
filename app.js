"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

let preset = null, brandAltMode = false, industries = [], lastBatch = null, lastTrendBrand = null;

// ---------- SVG helpers ----------
function svgDonut(score, size = 200, stroke = 18) {
  const r = (size - stroke) / 2, c = size / 2, circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 75 ? "#34d399" : score >= 55 ? "#fbbf24" : "#fb7185";
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#334155" stroke-width="${stroke}"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(1)} ${(circ - dash).toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>
    <text x="${c}" y="${c + 12}" text-anchor="middle" font-size="38" font-weight="bold" fill="#e6edf6">${score.toFixed(0)}</text>
    <text x="${c}" y="${c + 32}" text-anchor="middle" font-size="12" fill="#94a3b8">GEO 总分</text></svg>`;
}
function svgRadar(dims, size = 280) {
  const keys = Object.keys(dims), n = keys.length, cx = size / 2, cy = size / 2, R = size / 2 - 44;
  const pt = (i, val) => { const a = -90 + i * 360 / n * Math.PI / 180; return [cx + R * val / 100 * Math.cos(a), cy + R * val / 100 * Math.sin(a)]; };
  let s = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  for (const ring of [25, 50, 75, 100]) {
    const pts = keys.map((_, i) => pt(i, ring).map(v => v.toFixed(1)).join(",")).join(" ");
    s += `<polygon points="${pts}" fill="none" stroke="#334155" stroke-width="1"/>`;
  }
  keys.forEach((k, i) => {
    const [x, y] = pt(i, 100), [lx, ly] = pt(i, 122);
    s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#334155" stroke-width="1"/>`;
    s += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="11" fill="#8ea0b5">${esc(k)}</text>`;
  });
  const poly = keys.map((k, i) => pt(i, dims[k]).map(v => v.toFixed(1)).join(",")).join(" ");
  s += `<polygon points="${poly}" fill="rgba(52,211,153,0.25)" stroke="#34d399" stroke-width="2"/>`;
  keys.forEach((k, i) => { const [x, y] = pt(i, dims[k]); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#34d399"/>`; });
  return s + "</svg>";
}
function svgBars(labels, values, width = 620, height = 200, color = "#38bdf8") {
  const pl = 50, pb = 34, pt = 12, cw = width - pl - 12, ch = height - pb - pt;
  const mx = Math.max(...values, 1) * 1.1, n = Math.max(labels.length, 1), bw = cw / n * 0.55;
  let s = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  labels.forEach((lb, i) => {
    const bx = pl + i * (cw / n) + (cw / n - bw) / 2, bh = Math.max(2, values[i] / mx * ch), by = pt + ch - bh;
    s += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${color}"/>`;
    s += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(by - 6).toFixed(1)}" text-anchor="middle" font-size="12" fill="#e6edf6">${values[i].toFixed(1)}</text>`;
    s += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(pt + ch + 20).toFixed(1)}" text-anchor="middle" font-size="11" fill="#8ea0b5">${esc(lb)}</text>`;
  });
  return s + "</svg>";
}
function svgCmpBars(labels, values, colors, width = 430, height = 220) {
  const pl = 60, pb = 38, pt = 14, cw = width - pl - 12, ch = height - pb - pt;
  const mx = Math.max(...values, 1) * 1.1, n = Math.max(labels.length, 1), bw = cw / n * 0.6;
  let s = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  labels.forEach((lb, i) => {
    const bx = pl + i * (cw / n) + (cw / n - bw) / 2, bh = Math.max(2, values[i] / mx * ch), by = pt + ch - bh;
    s += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${colors[i] || "#38bdf8"}"/>`;
    s += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(by - 6).toFixed(1)}" text-anchor="middle" font-size="11" fill="#e6edf6">${values[i].toFixed(1)}</text>`;
    s += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(pt + ch + 20).toFixed(1)}" text-anchor="middle" font-size="10" fill="#8ea0b5">${esc(lb)}</text>`;
  });
  return s + "</svg>";
}
function svgPctBars(labels, values, pcts, width = 620, height = 230) {
  const pl = 60, pb = 38, pt = 14, cw = width - pl - 12, ch = height - pb - pt;
  const mx = Math.max(...values, 100) * 1.08, n = Math.max(labels.length, 1), bw = cw / n * 0.6;
  const tierColor = p => p >= 75 ? "#34d399" : p >= 50 ? "#38bdf8" : p >= 25 ? "#fbbf24" : "#fb7185";
  let s = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  labels.forEach((lb, i) => {
    const bx = pl + i * (cw / n) + (cw / n - bw) / 2, bh = Math.max(2, values[i] / mx * ch), by = pt + ch - bh;
    s += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${tierColor(pcts[i])}"/>`;
    s += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(by - 6).toFixed(1)}" text-anchor="middle" font-size="11" fill="#e6edf6">${values[i].toFixed(0)}</text>`;
    s += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(pt + ch + 20).toFixed(1)}" text-anchor="middle" font-size="10" fill="#8ea0b5">${esc(lb)}</text>`;
  });
  [[50, "#94a3b8", "P50 行业中位"], [75, "#34d399", "P75 领先线"]].forEach(([gv, gc, gl]) => {
    const gy = pt + ch - gv / mx * ch;
    s += `<line x1="${pl}" y1="${gy.toFixed(1)}" x2="${width - 12}" y2="${gy.toFixed(1)}" stroke="${gc}" stroke-width="1.2" stroke-dasharray="5 4"/>`;
    s += `<text x="${width - 12}" y="${(gy - 4).toFixed(1)}" font-size="10" fill="${gc}" text-anchor="end">${gl}</text>`;
  });
  return s + "</svg>";
}
function svgLine(dates, series, width = 430, height = 200) {
  const n = Math.max(dates.length, 2), pl = 46, pb = 26, pt = 20, cw = width - pl - 16, ch = height - pb - pt;
  let all = [];
  series.forEach(s => all = all.concat(s.values));
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1e-6) { hi = lo + 1; lo = lo - 1; }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  const x = i => pl + i * cw / (n - 1), y = v => pt + ch - (v - lo) / (hi - lo) * ch;
  let s = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  for (let g = 0; g < 5; g++) {
    const v = lo + (hi - lo) * g / 4;
    s += `<line x1="${pl}" y1="${y(v).toFixed(1)}" x2="${width - 16}" y2="${y(v).toFixed(1)}" stroke="#334155" stroke-width="1"/>`;
    s += `<text x="${pl - 5}" y="${(y(v) + 3).toFixed(1)}" font-size="9" fill="#9aa7b3" text-anchor="end">${v.toFixed(0)}</text>`;
  }
  dates.forEach((d, i) => {
    if (i === 0 || i === n - 1 || i === Math.floor(n / 2))
      s += `<text x="${x(i).toFixed(1)}" y="${height - 8}" font-size="9" fill="#9aa7b3" text-anchor="middle">${esc(d)}</text>`;
  });
  series.forEach((sr, j) => {
    const pts = sr.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    s += `<polyline points="${pts}" fill="none" stroke="${sr.color}" stroke-width="2"/>`;
    sr.values.forEach((v, i) => s += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${sr.color}"/>`);
    const lx = pl + j * 170, ly = 12;
    s += `<rect x="${lx}" y="${ly}" width="10" height="10" rx="2" fill="${sr.color}"/>`;
    s += `<text x="${lx + 14}" y="${ly + 10}" font-size="10" fill="#e6edf6">${esc(sr.label)}</text>`;
  });
  return s + "</svg>";
}
// ---------- v0.1 三指标趋势线（batch160） ----------
// 空点（该次快照没带 metrics_v01）不画假 0：线段断开 + 图例里报「N 次快照无数据」。
function v01Line(dates, series, width = 430, height = 200) {
  const n = Math.max(dates.length, 2), pl = 46, pb = 26, pt = 20, cw = width - pl - 16, ch = height - pb - pt;
  const all = [];
  series.forEach(sr => (sr.values || []).forEach(v => { if (v != null && isFinite(v)) all.push(+v); }));
  if (!all.length) return `<p class="muted" style="font-size:12px;margin:6px 0">这个品牌的历史快照里都没有 v0.1 三指标（metrics_v01）—— 只有跑到真答案轮次后保存的快照才带这三个数（2026-09 之前的历史快照不带）。换一个跑过真答案的品牌，或先跑一轮再存快照。</p>`;
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1e-6) { hi = lo + 1; lo = lo - 1; }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  const x = i => pl + i * cw / (n - 1), y = v => pt + ch - (v - lo) / (hi - lo) * ch;
  let s = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  for (let g = 0; g < 5; g++) {
    const v = lo + (hi - lo) * g / 4;
    s += `<line x1="${pl}" y1="${y(v).toFixed(1)}" x2="${width - 16}" y2="${y(v).toFixed(1)}" stroke="#334155" stroke-width="1"/>`;
    s += `<text x="${pl - 5}" y="${(y(v) + 3).toFixed(1)}" font-size="9" fill="#9aa7b3" text-anchor="end">${v.toFixed(1)}</text>`;
  }
  dates.forEach((d, i) => {
    if (i === 0 || i === n - 1 || i === Math.floor(n / 2))
      s += `<text x="${x(i).toFixed(1)}" y="${height - 8}" font-size="9" fill="#9aa7b3" text-anchor="middle">${esc(d)}</text>`;
  });
  series.forEach((sr, j) => {
    const vals = sr.values || [];
    let run = [], skipped = 0;
    const flush = () => {
      if (run.length > 1) s += `<polyline points="${run.join(" ")}" fill="none" stroke="${sr.color}" stroke-width="2"/>`;
      run.forEach(pt => s += `<circle cx="${pt.split(",")[0]}" cy="${pt.split(",")[1]}" r="3" fill="${sr.color}"/>`);
      run = [];
    };
    vals.forEach((v, i) => {
      if (v == null || !isFinite(v)) { skipped++; flush(); return; }
      run.push(`${x(i).toFixed(1)},${y(+v).toFixed(1)}`);
    });
    flush();
    const lx = pl + j * 190, ly = 12;
    s += `<rect x="${lx}" y="${ly}" width="10" height="10" rx="2" fill="${sr.color}"/>`;
    s += `<text x="${lx + 14}" y="${ly + 10}" font-size="10" fill="#e6edf6">${esc(sr.label)}${skipped ? "（" + skipped + " 次快照无数据）" : ""}</text>`;
  });
  return s + "</svg>";
}
// ---------- input parsing ----------
function parseCompetitors(text) {
  const blocks = text.split(/^={3,}\s*$/m).map(b => b.trim()).filter(Boolean);
  if (!blocks.length && text.trim()) blocks.push(text.trim());
  return blocks.map(b => {
    const lines = b.split(/\n/);
    const name = lines[0].trim() || "竞品";
    return { name, text: lines.slice(1).join("\n").trim() || b };
  });
}
function parseQueries(text) {
  return text.split(/\n/).map(q => q.trim()).filter(Boolean);
}
function resolveIndustry(label) {
  const t = String(label || "").trim();
  if (!t) return "consumer_electronics";
  const hit = industries.find(i => i.id === t || i.name === t);
  return hit ? hit.id : "consumer_electronics";
}
function parseBatchItems(text) {
  const blocks = text.split(/^={3,}\s*$/m).map(b => b.trim()).filter(Boolean);
  if (!blocks.length && text.trim()) blocks.push(text.trim());
  const out = [];
  blocks.forEach(b => {
    const lines = b.split(/\n/);
    let name = lines[0].trim(), industry = "consumer_electronics";
    const m = lines[0].match(/^(.+?)[:：]\s*(.+)$/);
    if (m) { industry = resolveIndustry(m[1].trim()); name = m[2].trim(); }
    out.push({ name: name || "品牌", industry, brand_text: lines.slice(1).join("\n").trim() });
  });
  return out;
}

// ---------- demo ----------
async function loadPreset() {
  const r = await fetch("/api/preset");
  preset = await r.json();
  brandAltMode = false;
  $("brandName").value = preset.brand_name;
  $("brandText").value = preset.brand_text;
  $("compText").value = preset.competitors.map(c => c.name + "\n" + c.text).join("\n===\n");
  $("queries").value = preset.queries.join("\n");
  if (preset.industry) $("brandIndustry").value = preset.industry;
  $("btnAlt").disabled = false;
  $("btnAlt").textContent = "切换基线版";
  flash("已载入演示数据：云清YQ-1（优化版） + 3个竞品 + 12条查询");
}
function toggleAlt() {
  if (!preset) return;
  brandAltMode = !brandAltMode;
  if (brandAltMode) {
    $("brandName").value = preset.brand_alt.name;
    $("brandText").value = preset.brand_alt.text;
    $("btnAlt").textContent = "切回优化版";
  } else {
    $("brandName").value = preset.brand_name;
    $("brandText").value = preset.brand_text;
    $("btnAlt").textContent = "切换基线版";
  }
}

// ---------- analyze (single) ----------
function currentPayload() {
  return {
    brand_name: $("brandName").value.trim(),
    industry: $("brandIndustry").value,
    brand_text: $("brandText").value,
    competitors: parseCompetitors($("compText").value),
    queries: parseQueries($("queries").value),
    options: { top_k: parseInt($("topK").value, 10) || 4, use_pref: $("usePref").checked }
  };
}
async function runAnalyze() {
  const payload = currentPayload();
  if (!payload.brand_text) { flash("请先填写品牌内容"); return; }
  const btn = $("btnRun");
  btn.disabled = true; btn.textContent = "诊断中…";
  try {
    const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const out = await r.json();
    if (!r.ok) throw new Error(out.error);
    render(out.result, out.recommendations, out.meta, out.benchmark);
    loadMvBox(payload.brand_name);
    $("btnReport").dataset.payload = JSON.stringify(payload);
    $("btnReport").disabled = false;
  } catch (e) {
    flash("诊断失败：" + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "开始诊断";
  }
}

const DIM_CN = { cite: "引用可验证", data: "数据增益", struct: "结构化", entity: "实体一致", authority: "权威背书", fluency: "流畅度", tech: "技术就绪" };
function dimNote(k) {
  return { cite: "权威引用与引文标注", data: "参数/统计/好评率等数据", struct: "问答与要点结构", entity: "品牌实体一致性", authority: "权威机构背书", fluency: "句长与可读性", tech: "结构化数据/可爬取信号" }[k] || "";
}
function tierHtml(tier) {
  const cls = { "领先": "ok", "中等偏上": "midc", "落后": "midc", "薄弱": "bad" }[tier] || "midc";
  return `<span class="${cls}">${esc(tier)}</span>`;
}
// ---------- v0.1 三指标（提到率 / 平均首次出现位置 / 价格不一致条数；对客只认这三个） ----------
function mvOf(it) {
  if (!it) return null;
  const m = it.metrics_v01 || (it.result && it.result.metrics_v01);
  return (m && typeof m === "object") ? m : null;
}
function fmtMv(v, unit, digits) {
  if (v == null || v === "" || isNaN(Number(v))) return "\u2014";
  return Number(v).toFixed(digits == null ? 1 : digits) + (unit || "");
}
function mvCells(it) {
  const m = mvOf(it) || {};
  return `<td><b>${fmtMv(m.mention_rate, "%")}</b></td><td>${fmtMv(m.avg_first_position)}</td>` +
         `<td>${fmtMv(m.price_conflicts, "", 0)}</td><td>${fmtMv(m.total_answers, "", 0)}</td>`;
}
function mvAvg(items, key) {
  const vs = items.map(mvOf).filter(Boolean).map(m => m[key])
    .filter(v => v != null && v !== "" && !isNaN(Number(v)));
  return vs.length ? vs.reduce((a, b) => a + Number(b), 0) / vs.length : null;
}
function mvBar(items, key) {
  const mvi = items.filter(it => mvOf(it));
  if (!mvi.length) {
    return `<p class="tip">本轮没有品牌拿到真答案原文 —— v0.1 三指标要真答案才算得出（见下表「本轮答案数」）；旧口径分数另见下表。</p>`;
  }
  return svgCmpBars(mvi.map(it => it.name),
                    mvi.map(it => Number((mvOf(it) || {})[key]) || 0),
                    mvi.map(it => tierColor(it.benchmark.overall_tier)));
}
async function loadMvBox(brand) {
  const box = $("mvBox");
  if (!box) return;
  box.innerHTML = `<p class="tip">v0.1 三指标加载中…</p>`;
  try {
    const r = await fetch("/api/metrics_v01?brand=" + encodeURIComponent(brand || ""));
    const out = await r.json();
    const m = out && out.latest;
    if (!m) {
      box.innerHTML = `<h3>v0.1 三指标（对客只认这三个）</h3>
        <p class="tip">「${esc(brand)}」还没有落盘的真答案轮次 —— 三指标要拿到答案原文才算得出（实测探针或引擎面批量跑过才有）；没跑过就是空。</p>`;
      return;
    }
    box.innerHTML = `<h3>v0.1 三指标（对客只认这三个）</h3>
      <div class="cards">
        <div class="card"><div class="v">${fmtMv(m.mention_rate, "%")}</div><div class="k">提到率</div></div>
        <div class="card"><div class="v">${fmtMv(m.avg_first_position)}</div><div class="k">平均首次出现位置</div></div>
        <div class="card"><div class="v">${fmtMv(m.price_conflicts, "", 0)}</div><div class="k">价格不一致条数</div></div>
        <div class="card"><div class="v">${fmtMv(m.total_answers, "", 0)}</div><div class="k">本轮答案数</div></div>
      </div>
      <p class="tip">最近一轮 ${esc(m.run_ts || "—")} · 引擎 ${esc((m.engines || []).join(" / ") || "—")} · 共 ${Number(out.count || 0)} 轮留档</p>`;
  } catch (e) {
    box.innerHTML = `<p class="tip">v0.1 三指标取不到：${esc(e.message)}</p>`;
  }
}


function render(res, recs, meta, bench) {
  $("empty").style.display = "none";
  $("result").style.display = "block";
  const s = res.summary, f = res.features;
  const cards = [
    ["GEO 总分（旧）", s.geo_score, ""], ["引用率（旧）", s.citation_rate, "%"],
    ["引用份额（旧）", s.share, "%"], ["首位率（旧）", s.top1_rate, "%"],
    ["可见性得分（旧）", s.visibility_score, ""], ["内容特征", s.feature_score, ""]
  ];
  $("cards").innerHTML = cards.map(([k, v, u]) =>
    `<div class="card"><div class="v">${Number(v).toFixed(1)}${u}</div><div class="k">${esc(k)}</div></div>`).join("");
  const strip = $("benchStrip");
  if (bench && bench.available && bench.overall_pct != null) {
    const pct = bench.overall_pct;
    const cls = pct >= 75 ? "big" : pct >= 50 ? "big warn" : "big bad";
    strip.style.display = "flex";
    strip.innerHTML = `<span class="lb">行业基准（${esc(bench.industry_label)}）</span>
      <span>百分位 <b class="${cls}">${pct.toFixed(1)}</b></span>
      <span>评价：${tierHtml(bench.overall_tier)}</span>
      <span class="muted">GEO总分 ${Number(s.geo_score).toFixed(1)} vs 行业P50 ${bench.metrics.geo_score ? bench.metrics.geo_score.p50 : "-"}</span>`;
  } else {
    strip.style.display = "none";
  }
  $("donut").innerHTML = svgDonut(s.geo_score);
  $("radar").innerHTML = svgRadar(Object.fromEntries(Object.entries(f.dim).map(([k, v]) => [DIM_CN[k] || k, v])));
  const its = Object.entries(res.intent);
  if (its.length) {
    $("intentChart").innerHTML = svgBars(its.map(([k, v]) => `${k}（${v.n}条）`), its.map(([, v]) => v.score));
    $("intentTable").innerHTML = `<tr><th>意图</th><th>查询数</th><th>引用率</th><th>首位率</th><th>得分</th><th>评价</th></tr>` + its.map(([k, v]) =>
      `<tr><td>${esc(k)}</td><td>${v.n}</td><td>${v.citation_rate}%</td><td>${v.top1_rate}%</td><td>${v.score}</td><td>${v.score >= 70 ? '<span class="ok">良好</span>' : v.score < 55 ? '<span class="bad">不足</span>' : '<span class="midc">一般</span>'}</td></tr>`).join("");
  }
  const dk = Object.keys(f.dim);
  $("dimChart").innerHTML = svgBars(dk.map(k => DIM_CN[k] || k), dk.map(k => f.dim[k]), 620, 200, "#fbbf24");
  $("dimTable").innerHTML = `<tr><th>维度</th><th>得分</th><th>说明</th><th>评价</th></tr>` + dk.map(k => {
    const v = f.dim[k];
    return `<tr><td>${esc(DIM_CN[k] || k)}</td><td>${v}</td><td>${esc(dimNote(k))}</td><td>${v >= 70 ? '<span class="ok">良好</span>' : v < 55 ? '<span class="bad">不足</span>' : '<span class="midc">一般</span>'}</td></tr>`;
  }).join("");
  $("recs").innerHTML = recs.length ? recs.map(r => {
    const cls = r.priority === "高" ? "" : r.priority === "中" ? "mid" : "low";
    return `<div class="rec ${cls}"><div class="t">${esc(r.strategy)}<span class="p">[${esc(r.priority)}优先] 当前 ${r.current} 分（目标 ≥ ${r.threshold}）</span></div>
      <div class="a">${esc(r.reason)}</div><div class="a"><b>行动：</b>${esc(r.action)}</div></div>`;
  }).join("") : `<p class="ok">未发现明显短板，继续保持。</p>`;
  $("qTable").innerHTML = `<tr><th>#</th><th>查询</th><th>意图</th><th>引用</th><th>最优位置</th></tr>` + res.queries.map((q, i) =>
    `<tr><td>${i + 1}</td><td>${esc(q.query)}</td><td>${esc(q.intent)}</td><td>${q.cited ? '<span class="ok">是</span>' : '<span class="bad">否</span>'}</td><td>${q.first_rank || "—"}</td></tr>`).join("");
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function downloadReport() {
  const payload = JSON.parse($("btnReport").dataset.payload || "{}");
  try {
    const r = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const out = await r.json();
    if (!r.ok) throw new Error(out.error);
    saveBlob(out.html, out.filename || "GEO诊断报告.html");
  } catch (e) { flash("报告生成失败：" + e.message); }
}
function saveBlob(text, filename) {
  const blob = new Blob([text], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- batch ----------
function batchDemo() {
  if (!preset || !preset.batch_items) return;
  const lines = preset.batch_items.map(it => {
    const label = (industries.find(i => i.id === it.industry) || {}).name || it.industry;
    return `${label}: ${it.name}\n${it.brand_text}`;
  });
  $("batchItems").value = lines.join("\n===\n");
  flash("已载入批量演示：4个品牌（消费电子与智能家居）");
}
async function runBatch() {
  const items = parseBatchItems($("batchItems").value);
  if (!items.length) { flash("请先填写监测清单"); return; }
  const btn = $("btnBatchRun");
  btn.disabled = true; btn.textContent = "批量分析中…";
  try {
    const r = await fetch("/api/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const batch = await r.json();
    if (!r.ok) throw new Error(batch.error);
    lastBatch = { items, result: batch };
    renderBatch(batch);
    $("btnBatchReport").disabled = false;
    $("btnSnapshot").disabled = false;
  } catch (e) {
    flash("批量监测失败：" + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "运行批量监测";
  }
}
function renderBatch(batch) {
  $("batchEmpty").style.display = "none";
  $("batchResult").style.display = "block";
  const items = batch.items;
  const nLead = items.filter(it => (it.benchmark.overall_pct || 0) >= 75).length;
  const nGap = items.filter(it => (it.benchmark.overall_pct || 0) < 50).length;
  const avgGeo = items.reduce((a, it) => a + it.result.summary.geo_score, 0) / Math.max(items.length, 1);
  const avgMention = mvAvg(items, "mention_rate"), avgFirst = mvAvg(items, "avg_first_position");
  const withMv = items.filter(it => mvOf(it)).length;
  $("batchCards").innerHTML = [
    ["监测品牌", items.length, ""], ["有真答案轮次", withMv, "/" + items.length],
    ["平均提到率", avgMention == null ? "—" : avgMention.toFixed(1), avgMention == null ? "" : "%"],
    ["平均首次出现位置", avgFirst == null ? "—" : avgFirst.toFixed(1), avgFirst == null ? "" : "段"],
    ["平均GEO（旧）", avgGeo.toFixed(1), "分"], ["领先（P75+，旧）", nLead, ""], ["待提升（P50-，旧）", nGap, ""]
  ].map(([k, v, u]) => `<div class="card"><div class="v">${v}${u}</div><div class="k">${esc(k)}</div></div>`).join("");
  $("batchTable").innerHTML = `<tr><th>品牌</th><th>行业</th><th>提到率</th><th>平均首次出现位置</th><th>价格不一致条数</th><th>本轮答案数</th><th>GEO总分（旧）</th><th>较上次</th><th>行业百分位</th><th>评价</th><th>引用率（旧）</th><th>份额（旧）</th><th>首位率（旧）</th><th>查询数</th></tr>` +
    items.map((it, idx) => {
      const s = it.result.summary, b = it.benchmark, d = it.delta;
      return `<tr><td><a class="brand-link" onclick="toggleDrill(${idx})">${esc(it.name)}</a></td><td>${esc(it.industry_label)}</td>
        ${mvCells(it)}
        <td>${s.geo_score.toFixed(1)}</td><td>${fmtDelta(d ? d.geo_score : null)}</td>
        <td><b>${b.overall_pct != null ? b.overall_pct.toFixed(1) : "—"}</b></td><td>${tierHtml(b.overall_tier)}</td>
        <td>${s.citation_rate.toFixed(1)}%</td><td>${s.share.toFixed(1)}%</td><td>${s.top1_rate.toFixed(1)}%</td><td>${it.queries_n}</td></tr>`;
    }).join("");
  $("batchDrill").style.display = "none";
  const names = items.map(it => it.name), colors = items.map(it => tierColor(it.benchmark.overall_tier));
  $("cmpGeo").innerHTML = '<h3>提到率（%）</h3>' + mvBar(items, "mention_rate");
  $("cmpCite").innerHTML = '<h3>平均首次出现位置（段）</h3>' + mvBar(items, "avg_first_position");
  $("cmpPct").innerHTML = svgPctBars(names, items.map(it => it.benchmark.overall_pct || 0), items.map(it => it.benchmark.overall_pct || 0));
  const its = ["事实型", "比较型", "建议型"];
  $("intentCmp").innerHTML = `<tr><th>品牌</th>${its.map(t => `<th>${esc(t)}</th>`).join("")}</tr>` + items.map(it => {
    const ints = it.benchmark.intent || {};
    return `<tr><td>${esc(it.name)}</td>${its.map(t => ints[t] ? `<td>${ints[t].value.toFixed(1)} <span class="muted">(P${ints[t].pct.toFixed(0)})</span></td>` : `<td class="muted">—</td>`).join("")}</tr>`;
  }).join("");
  $("batchRecs").innerHTML = items.map(it => {
    const recs = it.recommendations.slice(0, 3);
    const body = recs.length ? recs.map(r => {
      const cls = r.priority === "高" ? "" : r.priority === "中" ? "mid" : "low";
      return `<div class="rec ${cls}"><div class="t">${esc(r.strategy)}<span class="p">[${esc(r.priority)}优先] 当前 ${r.current} 分（目标 ≥ ${r.threshold}）</span></div><div class="a">${esc(r.reason)}</div></div>`;
    }).join("") : `<p class="ok">未发现明显短板，继续保持。</p>`;
    return `<h3>${esc(it.name)} <span class="muted">(${esc(it.industry_label)})</span></h3>${body}`;
  }).join("");
  $("batchResult").scrollIntoView({ behavior: "smooth", block: "start" });
}
function tierColor(tier) {
  return { "领先": "#34d399", "中等偏上": "#38bdf8", "落后": "#fbbf24", "薄弱": "#fb7185" }[tier] || "#38bdf8";
}
async function downloadBatchReport() {
  if (!lastBatch) return;
  try {
    const r = await fetch("/api/batch_report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lastBatch.items }) });
    const out = await r.json();
    if (!r.ok) throw new Error(out.error);
    saveBlob(out.html, out.filename || "GEO批量监测报告.html");
  } catch (e) { flash("批量报告生成失败：" + e.message); }
}
async function saveSnapshot() {
  if (!lastBatch) return;
  const btn = $("btnSnapshot");
  btn.disabled = true;
  try {
    const r = await fetch("/api/snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lastBatch.items }) });
    const out = await r.json();
    if (!r.ok) throw new Error(out.error);
    flash(`已保存 ${out.n} 个快照至 data/snapshots/`);
    await refreshTrendBrands();
  } catch (e) {
    flash("保存快照失败：" + e.message);
  } finally {
    btn.disabled = false;
  }
}
async function refreshTrendBrands() {
  try {
    const r = await fetch("/api/snapshots");
    const out = await r.json();
    const brands = (out.brands || []).filter(b => b.count >= 2);
    const sel = $("trendBrand");
    sel.innerHTML = brands.length ? brands.map(b => `<option value="${esc(b.brand)}">${esc(b.brand)}（${b.count}条）</option>`).join("")
      : `<option value="">暂无足够快照（≥2条）</option>`;
    $("btnTrend").disabled = !brands.length;
    $("btnTrendReport").disabled = true;
    if (lastTrendBrand && brands.some(b => b.brand === lastTrendBrand)) sel.value = lastTrendBrand;
  } catch (e) { /* ignore */ }
}
async function showTrend() {
  const brand = $("trendBrand").value;
  if (!brand) { flash("请先选择品牌"); return; }
  lastTrendBrand = brand;
  try {
    const r = await fetch("/api/trends?brand=" + encodeURIComponent(brand));
    const out = await r.json();
    if (!r.ok || !out.series) throw new Error("历史快照不足");
    const d = out.series.dates;
    const ser = out.series;
    const mvSeen = (ser.mention_rate || []).filter(v => v != null).length;
    $("trendArea").innerHTML =
      `<p class="tip" style="font-size:12px;margin:4px 0">共 ${out.count} 次快照，其中带 v0.1 三指标的 ${mvSeen} 次（提到率 / 平均首次出现位置 / 价格不一致条数）。</p>` +
      `<h3>提到率趋势（v0.1·%）</h3>${v01Line(d, [{ label: "提到率", color: "#38bdf8", values: ser.mention_rate }])}` +
      `<h3>平均首次出现位置趋势（v0.1·越低越好）</h3>${v01Line(d, [{ label: "平均首次出现位置", color: "#34d399", values: ser.avg_first_position }])}` +
      `<h3>价格不一致条数趋势（v0.1）</h3>${v01Line(d, [{ label: "价格不一致条数", color: "#fbbf24", values: ser.price_conflicts }])}` +
      `<details style="margin-top:10px"><summary class="tip" style="font-size:12px;cursor:pointer">旧口径三张图（GEO总分 / 引用率与份额 / 首位率 · 内部参考，不对外）</summary>` +
      `<h3>GEO总分趋势（旧）</h3>${svgLine(d, [{ label: "GEO总分（旧）", color: "#38bdf8", values: ser.geo_score }])}` +
      `<h3>引用率与份额趋势（旧·%）</h3>${svgLine(d, [{ label: "引用率（旧）", color: "#34d399", values: ser.citation_rate }, { label: "引用份额（旧）", color: "#fbbf24", values: ser.share }])}` +
      `<h3>首位率趋势（旧·%）</h3>${svgLine(d, [{ label: "首位率（旧）", color: "#a78bfa", values: ser.top1_rate }])}</details>`;
    $("btnTrendReport").disabled = false;
    $("btnTrendReport").dataset.brand = brand;
  } catch (e) {
    flash("趋势加载失败：" + e.message);
  }
}
async function downloadTrendReport() {
  const brand = $("btnTrendReport").dataset.brand;
  if (!brand) return;
  try {
    const r = await fetch("/api/trend_report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand }) });
    const out = await r.json();
    if (!r.ok) throw new Error(out.error);
    saveBlob(out.html, out.filename || "GEO趋势报告.html");
  } catch (e) { flash("趋势报告生成失败：" + e.message); }
}

function flash(msg) {
  const d = document.createElement("div");
  d.textContent = msg;
  d.style.cssText = "position:fixed;top:18px;left:50%;transform:translateX(-50%);background:rgba(13,20,32,.94);color:#fff;padding:10px 18px;border-radius:8px;z-index:99;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.2)";
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}

// ---------- 品牌对比（v0.14.0） ----------
function parseCompareItems(text) {
  return text.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(.+?)[:：]\s*(.+)$/);
    const ind = m ? m[1].trim() : "消费电子与智能家居";
    return { name: m ? m[2].trim() : l, industry: resolveIndustry(ind) };
  }).filter(it => it.name);
}
function compareDemo() {
  $("compareItems").value = [
    "消费电子与智能家居: 云清YQ-1",
    "消费电子与智能家居: 科沃斯T30",
    "消费电子与智能家居: 石头G20S",
    "SaaS与B2B软件: 用友YonSuite"
  ].join("\n");
}
function fmtDelta(v) {
  if (v == null) return `<span class="muted">—</span>`;
  if (v > 0) return `<span class="delta up">▲ ${v.toFixed(1)}</span>`;
  if (v < 0) return `<span class="delta down">▼ ${v.toFixed(1)}</span>`;
  return `<span class="delta flat">0.0</span>`;
}
async function runCompare() {
  const items = parseCompareItems($("compareItems").value);
  if (!items.length) { flash("请先填写对比品牌"); return; }
  const btn = $("btnCompareRun");
  btn.disabled = true; btn.textContent = "对比分析中…";
  try {
    const r = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const batch = await r.json();
    if (!r.ok) throw new Error(batch.error);
    renderCompare(batch);
  } catch (e) { flash("对比失败：" + e.message); }
  finally { btn.disabled = false; btn.textContent = "生成对比"; }
}
function renderCompare(batch) {
  $("compareEmpty").style.display = "none";
  $("compareResult").style.display = "block";
  const items = batch.items;
  const geos = items.map(it => it.result.summary.geo_score);
  const avg = geos.reduce((a, b) => a + b, 0) / Math.max(items.length, 1);
  const nLead = items.filter(it => (it.benchmark.overall_pct || 0) >= 75).length;
  const nGap = items.filter(it => (it.benchmark.overall_pct || 0) < 50).length;
  const avgMention = mvAvg(items, "mention_rate"), avgFirst = mvAvg(items, "avg_first_position");
  const withMv = items.filter(it => mvOf(it)).length;
  $("compareCards").innerHTML = [
    ["对比品牌", items.length, ""], ["有真答案轮次", withMv, "/" + items.length],
    ["平均提到率", avgMention == null ? "—" : avgMention.toFixed(1), avgMention == null ? "" : "%"],
    ["平均首次出现位置", avgFirst == null ? "—" : avgFirst.toFixed(1), avgFirst == null ? "" : "段"],
    ["平均GEO（旧）", avg.toFixed(1), "分"], ["领先（P75+，旧）", nLead, ""], ["待提升（P50-，旧）", nGap, ""]
  ].map(([k, v, u]) => `<div class="card"><div class="v">${v}${u}</div><div class="k">${esc(k)}</div></div>`).join("");
  $("compareTable").innerHTML = `<tr><th>品牌</th><th>行业</th><th>提到率</th><th>平均首次出现位置</th><th>价格不一致条数</th><th>本轮答案数</th><th>GEO总分（旧）</th><th>较上次</th><th>引用率（旧）</th><th>份额（旧）</th><th>首位率（旧）</th><th>百分位</th><th>评价</th></tr>` +
    items.map(it => {
      const s = it.result.summary, b = it.benchmark, d = it.delta;
      return `<tr><td><b>${esc(it.name)}</b></td><td>${esc(it.industry_label)}</td>
        ${mvCells(it)}
        <td>${s.geo_score.toFixed(1)}</td><td>${fmtDelta(d ? d.geo_score : null)}</td>
        <td>${s.citation_rate.toFixed(1)}%</td><td>${s.share.toFixed(1)}%</td><td>${s.top1_rate.toFixed(1)}%</td>
        <td><b>${b.overall_pct != null ? b.overall_pct.toFixed(1) : "—"}</b></td><td>${tierHtml(b.overall_tier)}</td></tr>`;
    }).join("");
  const colors = items.map(it => tierColor(it.benchmark.overall_tier));
  $("compareGeo").innerHTML = '<h3>提到率（%）</h3>' + mvBar(items, "mention_rate");
  $("compareRadar").innerHTML = svgRadarOverlay(items.map(it => ({ name: it.name, dims: it.result.features.dim })));
  const its = ["事实型", "比较型", "建议型"];
  $("compareIntent").innerHTML = `<tr><th>品牌</th>${its.map(t => `<th>${esc(t)}</th>`).join("")}</tr>` + items.map(it => {
    const ints = it.benchmark.intent || {};
    return `<tr><td>${esc(it.name)}</td>${its.map(t => ints[t] ? `<td>${ints[t].value.toFixed(1)} <span class="muted">(P${ints[t].pct.toFixed(0)})</span></td>` : `<td class="muted">—</td>`).join("")}</tr>`;
  }).join("");
  $("compareResult").scrollIntoView({ behavior: "smooth", block: "start" });
}
function svgRadarOverlay(brands, size = 380) {
  const keys = brands.length ? Object.keys(brands[0].dims || {}) : [];
  const n = Math.max(keys.length, 1), cx = size / 2, cy = size / 2, R = size / 2 - 54;
  const pt = (i, val) => { const a = -90 + i * 360 / n * Math.PI / 180; return [cx + R * val / 100 * Math.cos(a), cy + R * val / 100 * Math.sin(a)]; };
  let s = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  for (let ring = 20; ring <= 100; ring += 20) {
    const pts = keys.map((_, i) => pt(i, ring).map(v => v.toFixed(1)).join(",")).join(" ");
    s += `<polygon points="${pts}" fill="none" stroke="#334155" stroke-width="1"/>`;
  }
  keys.forEach((k, i) => {
    const [x, y] = pt(i, 100), [lx, ly] = pt(i, 124);
    s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#334155"/>`;
    s += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11" text-anchor="middle" fill="#8ea0b5">${esc(DIM_CN[k] || k)}</text>`;
  });
  const palette = ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#94a3b8"];
  brands.forEach((br, bi) => {
    const poly = keys.map((k, i) => pt(i, br.dims[k]).map(v => v.toFixed(1)).join(",")).join(" ");
    s += `<polygon points="${poly}" fill="${palette[bi % palette.length]}" fill-opacity="0.14" stroke="${palette[bi % palette.length]}" stroke-width="2"/>`;
  });
  s += `<g font-size="11">`;
  brands.forEach((br, bi) => { s += `<rect x="14" y="${14 + bi * 16}" width="9" height="9" rx="2" fill="${palette[bi % palette.length]}"/><text x="28" y="${23 + bi * 16}" fill="#c7d2e0">${esc(br.name)}</text>`; });
  s += `</g></svg>`;
  return s;
}
// ---------- 批量结果：查询下钻（v0.14.0） ----------
function toggleDrill(idx) {
  const batch = lastBatch && lastBatch.result;
  if (!batch || !batch.items[idx]) return;
  const it = batch.items[idx], box = $("batchDrill");
  const qs = it.result.queries || [];
  box.innerHTML = `<h4>${esc(it.name)} · 查询级明细（${qs.length} 个查询）</h4>` +
    `<table class="tbl"><tr><th>查询</th><th>意图</th><th>是否被引用</th><th>首次排名</th></tr>` +
    qs.map(q => `<tr><td>${esc(q.query)}</td><td>${esc(q.intent)}</td><td>${q.cited ? '<span class="ok">是</span>' : '<span class="bad">否</span>'}</td><td>${q.first_rank != null ? "#" + q.first_rank : "—"}</td></tr>`).join("") + `</table>`;
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
// ---------- 多品牌趋势对比（v0.14.0） ----------
function svgLines(seriesList, width = 470, height = 230) {
  const pl = 40, pb = 24, pt = 16, cw = width - pl - 14, ch = height - pb - pt;
  let all = [];
  seriesList.forEach(sr => (sr.values || []).forEach(v => all.push(v)));
  if (!all.length) return "";
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.15 || 5; lo -= pad; hi += pad;
  const x = (i, len) => pl + (len <= 1 ? 0 : i * cw / (len - 1));
  const y = v => pt + ch - (v - lo) / (hi - lo) * ch;
  let s = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  for (let g = 0; g <= 4; g++) {
    const v = lo + (hi - lo) * g / 4;
    s += `<line x1="${pl}" y1="${y(v).toFixed(1)}" x2="${width - 12}" y2="${y(v).toFixed(1)}" stroke="#334155"/>`;
    s += `<text x="${pl - 6}" y="${(y(v) + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="#98a2b3">${v.toFixed(0)}</text>`;
  }
  const palette = ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee"];
  seriesList.forEach((sr, si) => {
    const c = palette[si % palette.length];
    const vals = sr.values || [];
    const pts = vals.map((v, i) => `${x(i, vals.length).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    if (vals.length > 1) s += `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2"/>`;
    else s += `<circle cx="${x(0, 1).toFixed(1)}" cy="${y(vals[0]).toFixed(1)}" r="3" fill="${c}"/>`;
    const li = vals.length - 1;
    s += `<text x="${(x(li, vals.length) + 5).toFixed(1)}" y="${(y(vals[li]) + 3).toFixed(1)}" font-size="10" fill="${c}">${esc(sr.name)}</text>`;
  });
  s += `</svg>`;
  return s;
}
async function showTrendCompare() {
  const box = $("trendCompareArea");
  box.innerHTML = "加载中…";
  try {
    const r = await fetch("/api/snapshots");
    const out = await r.json();
    const brands = (out.brands || []).filter(b => b.count >= 2);
    if (!brands.length) { box.innerHTML = `<p class="muted">暂无累计快照（≥2 次）的品牌，先运行批量监测并保存快照。</p>`; return; }
    const series = [];
    let skipped = 0;
    for (const b of brands) {
      const rr = await fetch("/api/trends?brand=" + encodeURIComponent(b.brand));
      const t = await rr.json();
      const vals = ((t.series && t.series.mention_rate) || []).filter(v => v != null && isFinite(v)).map(Number);
      if (vals.length) series.push({ name: b.brand, values: vals }); else skipped++;
    }
    box.innerHTML = `<div class="tip" style="margin:4px 0">提到率趋势（v0.1·%，${series.length} 个品牌，快照≥2次${skipped ? "；另有 " + skipped + " 个品牌的历史快照不带 v0.1 三指标，未进图" : ""}）</div>` + svgLines(series);
  } catch (e) { box.innerHTML = `<p class="bad">加载失败：${esc(e.message)}</p>`; }
}
// ---------- init ----------
async function init() {
  try {
    const r = await fetch("/api/health");
    const h = await r.json();
    $("verBadge").textContent = "v" + h.version;
  } catch (e) { /* 服务端不可达 */ }
  try {
    const r = await fetch("/api/benchmarks");
    const out = await r.json();
    industries = out.industries || [];
    $("brandIndustry").innerHTML = industries.map(i => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join("");
  } catch (e) { /* ignore */ }
  await refreshTrendBrands();
}
function switchTab(view) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
  $("viewSingle").style.display = view === "viewSingle" ? "flex" : "none";
  $("viewBatch").style.display = view === "viewBatch" ? "flex" : "none";
  $("viewPricing").style.display = view === "viewPricing" ? "flex" : "none";
  $("viewCompare").style.display = view === "viewCompare" ? "flex" : "none";
  $("viewOps").style.display = view === "viewOps" ? "flex" : "none";
}

$("btnRun").addEventListener("click", runAnalyze);
$("btnDemo").addEventListener("click", loadPreset);
$("btnAlt").addEventListener("click", toggleAlt);
$("btnReport").addEventListener("click", downloadReport);
$("tabSingle").addEventListener("click", () => switchTab("viewSingle"));
$("tabBatch").addEventListener("click", () => switchTab("viewBatch"));
$("tabPricing").addEventListener("click", () => switchTab("viewPricing"));
$("tabOps").addEventListener("click", () => { switchTab("viewOps"); loadLeads(); refreshT0(); loadChecks(); loadOrders(); });
$("tabCompare").addEventListener("click", () => switchTab("viewCompare"));
$("btnBatchDemo").addEventListener("click", batchDemo);
$("btnBatchClear").addEventListener("click", () => { $("batchItems").value = ""; });
$("btnBatchRun").addEventListener("click", runBatch);
$("btnBatchReport").addEventListener("click", downloadBatchReport);
$("btnSnapshot").addEventListener("click", saveSnapshot);
$("btnTrend").addEventListener("click", showTrend);
$("btnTrendReport").addEventListener("click", downloadTrendReport);
$("btnCompareRun").addEventListener("click", runCompare);
$("btnCompareDemo").addEventListener("click", compareDemo);
$("btnCompareClear").addEventListener("click", () => { $("compareItems").value = ""; $("compareResult").style.display = "none"; $("compareEmpty").style.display = "block"; });
$("btnTrendCompare").addEventListener("click", showTrendCompare);
init();

// ---------- 评估模式 ----------
async function loadMode() {
  try {
    const r = await fetch("/api/mode");
    const out = await r.json();
    $("modeBadge").textContent = out.effective;
    $("modeSelect").value = out.mode;
  } catch (e) { /* ignore */ }
}
async function saveMode() {
  const mode = $("modeSelect").value;
  try {
    const r = await fetch("/api/mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: mode }) });
    const out = await r.json();
    if (!r.ok) throw new Error(out.error);
    $("modeBadge").textContent = out.effective;
    flash("评估模式已切换：" + out.effective);
  } catch (e) { flash("模式切换失败：" + e.message); }
}

// ---------- 自动监测 ----------
async function loadMonitor() {
  try {
    const r = await fetch("/api/monitor");
    const st = await r.json();
    $("monEnabled").checked = !!st.enabled;
    $("monInterval").value = st.interval_hours || 24;
    const status = st.last_status === "ok" ? '<span class="ok">成功</span>' : '<span class="bad">失败</span>';
    const lines = [
      `状态：${st.enabled ? '<span class="ok">已启用</span>' : '<span class="muted">未启用</span>'} ｜ 间隔 ${st.interval_hours} 小时 ｜ 清单 ${st.items_n} 个品牌`,
      st.last_run ? `上次运行：${esc(st.last_run)}（${status}${st.last_error ? "：" + esc(st.last_error) : ""}）` : "上次运行：—",
      st.enabled ? `下次运行：${esc(st.next_run || "—")}` : ""
    ];
    $("monStatus").innerHTML = lines.filter(Boolean).join("<br>");
    const hist = st.history || [];
    $("monHistory").innerHTML = hist.length
      ? `<table class="tbl"><tr><th>时间</th><th>品牌数</th><th>行业数</th><th>提到率<br>（v0.1）</th><th>平均首次位置<br>（v0.1）</th><th>价格不一致<br>（v0.1）</th><th>平均GEO<br>（旧）</th></tr>` + hist.slice(0, 8).map(h =>
        `<tr><td>${esc(h.ts)}</td><td>${h.n}</td><td>${h.industries_n}</td>` +
        `<td>${h.avg_mention_rate != null ? h.avg_mention_rate.toFixed(1) + "%" : "—"}</td>` +
        `<td>${h.avg_first_position != null ? h.avg_first_position.toFixed(2) : "—"}</td>` +
        `<td>${h.price_conflicts_total != null ? h.price_conflicts_total : "—"}</td>` +
        `<td class="muted">${h.avg_geo != null ? h.avg_geo.toFixed(1) : "—"}</td></tr>`).join("") + `</table>`
        + `<p class="tip" style="font-size:11px;margin:4px 0">v0.1 三指标只按本轮「拿到真答案」的品牌取平均（最近一轮 ${hist[0].mv_n || 0}/${hist[0].n} 个品牌有数）；「平均GEO（旧）」只作对照。</p>`
      : "";
  } catch (e) { /* ignore */ }
}
async function saveMonitor() {
  try {
    const r = await fetch("/api/monitor", { method: "POST", headers: opsHeaders(),
      body: JSON.stringify({ enabled: $("monEnabled").checked, interval_hours: parseFloat($("monInterval").value) || 24 }) });
    const out = await r.json();
    if (!r.ok) throw new Error(out.error);
    flash(out.enabled ? `自动监测已启用（每 ${out.interval_hours} 小时）` : "自动监测已停用");
    await loadMonitor();
  } catch (e) { flash("保存失败：" + e.message); }
}
async function runMonitorNow() {
  const btn = $("btnMonRun");
  btn.disabled = true; btn.textContent = "运行中…";
  try {
    const r = await fetch("/api/monitor/run", { method: "POST", headers: opsHeaders(), body: "{}" });
    const out = await r.json();
    if (!r.ok || !out.ok) throw new Error(out.error || "运行失败");
    flash(`自动监测完成：${out.summary.n} 个品牌 / ${out.summary.industries_n} 个行业 / v0.1：提到率 ${out.summary.avg_mention_rate != null ? out.summary.avg_mention_rate + "%" : "—"}、平均首次位置 ${out.summary.avg_first_position != null ? out.summary.avg_first_position : "—"}、价格不一致 ${out.summary.price_conflicts_total != null ? out.summary.price_conflicts_total : "—"} 条 / 平均GEO（旧） ${out.summary.avg_geo}`);
    await loadMonitor();
    await refreshTrendBrands();
  } catch (e) { flash("运行失败：" + e.message); } finally {
    btn.disabled = false; btn.textContent = "立即运行一次";
  }
}

$("modeSelect").addEventListener("change", saveMode);
$("btnMonSave").addEventListener("click", saveMonitor);
$("btnMonRun").addEventListener("click", runMonitorNow);
loadMode();
loadMonitor();

// ---------------- 运营台：线索 / T0 批量 / 晨检 ----------------
let OPS_TOKEN = sessionStorage.getItem("ops_token") || "";
function opsHeaders() {
  const h = { "Content-Type": "application/json" };
  if (OPS_TOKEN) h["X-Leads-Token"] = OPS_TOKEN;
  return h;
}
$("opsToken").value = OPS_TOKEN;
$("btnOpsSave").addEventListener("click", () => {
  OPS_TOKEN = ($("opsToken").value || "").trim();
  sessionStorage.setItem("ops_token", OPS_TOKEN);
  $("opsAuthMsg").textContent = "已保存（本浏览器会话有效）";
  loadLeads();
});
async function loadLeads() {
  try {
    const r = await fetch("/api/leads", { headers: opsHeaders() });
    if (r.status === 403) { $("leadsBox").innerHTML = `<div class="tip">口令错误或无权限</div>`; return; }
    const out = await r.json();
    const rows = (out.leads || []).slice().reverse();
    if (!rows.length) { $("leadsBox").innerHTML = `<div class="tip">暂无留资</div>`; return; }
    $("leadsBox").innerHTML = `<table class="tbl"><tr><th>时间</th><th>姓名</th><th>联系方式</th><th>公司</th><th>行业</th><th>来源</th></tr>` +
      rows.map(l => `<tr><td>${esc(l.ts || "")}</td><td>${esc(l.name || "")}</td><td>${esc(l.contact || "")}</td><td>${esc(l.company || "")}</td><td>${esc(l.industry || "")}</td><td>${esc(l.source || "")}</td></tr>`).join("") + `</table>`;
  } catch (e) { $("leadsBox").innerHTML = `<div class="tip">加载失败：${esc(e.message)}</div>`; }
}
async function runT0() {
  $("t0Box").innerHTML = `<div class="tip">任务已提交，请等待…</div>`;
  try {
    const r = await fetch("/api/t0/run", { method: "POST", headers: opsHeaders(), body: "{}" });
    const out = await r.json();
    if (!r.ok) { $("t0Box").innerHTML = `<div class="tip">${esc(out.error || r.status)}</div>`; return; }
    if (!out.ok) { $("t0Box").innerHTML = `<div class="tip">已有任务在运行，请先等待完成</div>`; return; }
    refreshT0();
    const iv = setInterval(() => {
      refreshT0();
      fetch("/api/t0/status").then(r => r.json()).then(st => { if (!st.running) clearInterval(iv); }).catch(() => {});
    }, 15000);
  } catch (e) { $("t0Box").innerHTML = `<div class="tip">提交失败：${esc(e.message)}</div>`; }
}
async function refreshT0() {
  try {
    const r = await fetch("/api/t0/status");
    const st = await r.json();
    const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    let html = `<div class="tip">运行中：${st.running ? "是" : "否"}｜进度 ${st.done}/${st.total}（${pct}%）｜当前：${esc(st.current || "—")}</div>`;
    if (st.error) html += `<div style="color:#f87171;margin-top:4px">错误：${esc(st.error)}</div>`;
    html += `<ul style="font-size:12px;line-height:1.7;margin-top:4px">` + (st.log || []).slice(-12).map(x => `<li>${esc(x)}</li>`).join("") + `</ul>`;
    if (st.manifest && st.manifest.length) {
      html += `<div class="tip" style="margin-top:6px">已生成报告：</div><ul style="font-size:12px;line-height:1.7">` +
        st.manifest.map(m => `<li>${esc(m.name)}｜GEO ${esc(m.geo_score)}｜引用率 ${esc(m.citation_rate)}%｜<a href="${esc(m.file)}" target="_blank">打开报告</a></li>`).join("") + `</ul>`;
    }
    $("t0Box").innerHTML = html;
  } catch (e) { $("t0Box").innerHTML = `<div class="tip">状态读取失败：${esc(e.message)}</div>`; }
}
async function loadOrders() {
  const box = $("ordersBox");
  try {
    const r = await fetch("/api/orders", { headers: opsHeaders() });
    if (r.status === 403) { box.innerHTML = `<div class="tip">口令错误或无权限</div>`; return; }
    const out = await r.json();
    const rows = (out.orders || []).slice().reverse();
    if (!rows.length) { box.innerHTML = `<div class="tip">暂无收款记录</div>`; return; }
    let total = 0, paid = 0;
    rows.forEach(o => { const a = Number(o.amount) || 0; total += a; if (String(o.status).indexOf("已收") >= 0) paid += a; });
    const html = `<div class="tip">共 ${rows.length} 笔｜应收合计 ¥${total}｜已收 ¥${paid}</div>` +
      `<table class="tbl"><tr><th>单号</th><th>客户</th><th>公司</th><th>套餐</th><th>金额</th><th>方式</th><th>状态</th><th>合同</th><th>发票</th><th>备注</th><th>操作</th></tr>` +
      rows.map(o => `<tr><td>${esc(o.id)}</td><td>${esc(o.customer)}</td><td>${esc(o.company)}</td><td>${esc(o.package)}</td>` +
        `<td>¥${esc(o.amount)}</td><td>${esc(o.pay_method)}</td><td>${esc(o.status)}</td>` +
        `<td>${contractBadge(o)}</td><td>${esc(o.invoice)}</td>` +
        `<td>${esc(o.remark)}</td><td>` +
        (String(o.status).indexOf("已收") < 0 ? `<button onclick="setOrder('${esc(o.id)}','已收款','')">收款</button>` : `<button onclick="setOrder('${esc(o.id)}','已收款','')" disabled>已收</button>`) +
        ` <button onclick="setOrder('${esc(o.id)}','','已开票')">开票</button>` + contractOps(o) + `</td></tr>`).join("") + `</table>`;
    box.innerHTML = html;
  } catch (e) { box.innerHTML = `<div class="tip">加载失败：${esc(e.message)}</div>`; }
}
function contractBadge(o) {
  if (o.contract_status === "已签署") return `<span style="color:#16a34a;font-weight:bold">已签署</span>` + (o.contract_sign ? `<br><span style="font-size:11px;color:#888">${esc((o.contract_sign.ts || "").replace("T", " ").slice(5, 16))}</span>` : "");
  if (o.contract_status === "待签署") return `<span style="color:#b45309">待签署</span>`;
  return `<span style="color:#9ca3af">未生成</span>`;
}
function contractOps(o) {
  if (o.contract_status === "已签署") return ` <button onclick="showSignDetail('${esc(o.id)}')">签署详情</button>`;
  if (o.contract_status === "待签署") return ` <button onclick="genPushContract('${esc(o.id)}')">推送链接</button> <button onclick="copyContractLink('${esc(o.id)}')">合同链接</button>`;
  return ` <button onclick="genPushContract('${esc(o.id)}')">生成并推送</button>`;
}
function contractUrl(id, code) {
  return location.origin + "/contract.html?id=" + encodeURIComponent(id) + "&code=" + encodeURIComponent(code);
}
async function genContract(id) {
  if (!confirm("为该订单生成网签合同？（合同编号自动生成，重复生成不会变更编号）")) return;
  const r = await fetch("/api/order/contract", { method: "POST", headers: opsHeaders(), body: JSON.stringify({ id }) });
  const out = await r.json();
  if (!r.ok) { alert(out.error || "生成失败"); return; }
  prompt("网签链接（发给客户，客户打开后在线签署）", contractUrl(id, out.order.contract_code));
  loadOrders();
}
async function genPushContract(id) {
  if (!confirm("生成网签合同并推送签署链接到企微群/邮件？（重复推送不会改变合同编号）")) return;
  const r = await fetch("/api/contract/gen_push", { method: "POST", headers: opsHeaders(), body: JSON.stringify({ id }) });
  const out = await r.json();
  if (!r.ok) { alert(out.error || "生成/推送失败"); return; }
  const pc = out.pushed || {};
  alert("合同编号：" + out.contract_no + "\n已推送企微群：" + (pc.wecom ? "是" : "否") + "\n已推送邮件：" + (pc.mail ? "是" : "否") + "\n\n签署链接：\n" + out.link);
  loadOrders();
}
async function copyContractLink(id) {
  const r = await fetch("/api/orders", { headers: opsHeaders() });
  const out = await r.json();
  const o = (out.orders || []).find(x => x.id === id);
  if (!o || !o.contract_code) { alert("未找到合同，请先生成"); return; }
  prompt("网签链接（发给客户，客户打开后在线签署）", contractUrl(id, o.contract_code));
}
async function showSignDetail(id) {
  const r = await fetch("/api/orders", { headers: opsHeaders() });
  const out = await r.json();
  const o = (out.orders || []).find(x => x.id === id);
  const s = o && o.contract_sign;
  if (!s) { alert("该订单尚未签署"); return; }
  alert("合同编号：" + o.contract_no + "\n订单号：" + o.id + "\n签署人：" + s.name + "\n手机号：" + s.phone + "\n公司：" + (s.company || "-") + "\n签署时间：" + s.ts + "\nIP：" + s.ip + "\n内容指纹：" + String(s.digest || "").slice(0, 16));
}
async function addOrder() {
  const payload = {
    customer: $("oCustomer").value.trim(),
    company: $("oCompany").value.trim(),
    package: $("oPackage").value,
    amount: Number($("oAmount").value),
    pay_method: $("oPayMethod").value,
    remark: $("oRemark").value.trim(),
    status: "待收款",
    invoice: "未开票",
  };
  if (!payload.customer || !payload.amount) { alert("请填写客户名称与金额"); return; }
  const r = await fetch("/api/order", { method: "POST", headers: opsHeaders(), body: JSON.stringify(payload) });
  const out = await r.json();
  if (!r.ok) { alert(out.error || "登记失败"); return; }
  $("oCustomer").value = ""; $("oCompany").value = ""; $("oAmount").value = ""; $("oRemark").value = "";
  loadOrders();
}
async function setOrder(id, status, invoice) {
  const body = { id };
  if (status) body.status = status;
  if (invoice) body.invoice = invoice;
  const r = await fetch("/api/order/update", { method: "POST", headers: opsHeaders(), body: JSON.stringify(body) });
  const out = await r.json();
  if (!r.ok) { alert(out.error || "更新失败"); return; }
  loadOrders();
}
async function loadChecks() {
  try {
    const r = await fetch("/api/daily_checks");
    const out = await r.json();
    const rows = out.checks || [];
    if (!rows.length) { $("checksBox").innerHTML = `<div class="tip">暂无晨检记录（明早 8:30 定时任务跑过后自动出现）</div>`; return; }
    $("checksBox").innerHTML = `<ul style="font-size:12px;line-height:1.7">` +
      rows.map(c => `<li>${esc(c.ts || "")}｜${esc(c.service || "")}｜${esc(c.health || "")}｜T0:${esc(c.t0 || "")}｜磁盘${esc(c.disk || "")}${(c.leads || []).length ? "｜留资" + c.leads.length + "条" : ""}</li>`).join("") + `</ul>`;
  } catch (e) { $("checksBox").innerHTML = `<div class="tip">加载失败：${esc(e.message)}</div>`; }
}
$("btnT0Run").addEventListener("click", runT0);
$("btnT0Refresh").addEventListener("click", refreshT0);
$("btnOrderAdd").addEventListener("click", addOrder);
$("btnDocs").addEventListener("click", () => {
  const t = OPS_TOKEN ? "?token=" + encodeURIComponent(OPS_TOKEN) : "";
  location.href = "/local.html" + t;
});

