/* 业务运行监控中心 · 公共脚本（数据、登录、数据维护、权限管理、图表）
   各风格页面在加载本文件前定义 window.THEME：
   { id, CL:[5色], sep, hole, fill, areaOp:[上,下], labels, barGrad, area, sceneBg, road, switch:[[名称,文件,id],...] } */
const TH = window.THEME;

/* ================= 配置（上线前替换） ================= */
const LINKS = {
  shihua:  '',   // 石化信息管理平台 内网地址
  landport:'',   // 陆地港非贸业务可视化平台 内网地址
  airport: ''    // 空港旅检信息管理平台 内网地址
};

/* ================= 工具 ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => (n == null || !isFinite(n)) ? '—' : Number(n).toLocaleString('en-US', {maximumFractionDigits: 2});
const cfmt = n => (n == null || !isFinite(n)) ? '—' : Math.abs(n) >= 10000 ? (n / 10000).toFixed(1) + '万' : fmt(n);
const CL = TH.CL;
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch (e) { return d } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 3600) }
function go(key, name){
  const u = LINKS[key];
  if (!u) toast('【' + name + '】跳转地址尚未配置，请在 dash-core.js 顶部 LINKS 中填写内网地址。');
  else window.open(u, '_blank', 'noopener');
}

/* ================= 周期 ================= */
const QRE = /^(\d{4})Q([1-4])$/;
const ALL_MONTHS = [];
for (let y = 2024, m = 7; y * 100 + m <= 202610; ) {
  ALL_MONTHS.push(`${y}-${String(m).padStart(2, '0')}`);
  if (++m > 12) { m = 1; y++ }
}
const qMonths = q => { const y = +q.slice(0, 4), n = +q.slice(5); return [1, 2, 3].map(i => `${y}-${String((n - 1) * 3 + i).padStart(2, '0')}`) };
const monthToQ = mo => `${mo.slice(0, 4)}Q${Math.ceil(+mo.slice(5) / 3)}`;
const ALL_QUARTERS = [...new Set(ALL_MONTHS.map(monthToQ))].filter(q => qMonths(q).every(m => ALL_MONTHS.includes(m)));
const CUR = {m: '2026-10', q: '2026Q3'};
const prevP = p => (+p.slice(0, 4) - 1) + p.slice(4);
const periodLabel = p => QRE.test(p) ? `${p.slice(0, 4)}年第${p.slice(5)}季度` : `${p.slice(0, 4)}年${+p.slice(5)}月`;
const periodRange = p => QRE.test(p) ? `${qMonths(p)[0]} ~ ${qMonths(p)[2]}` : p;
const shortLabel = p => QRE.test(p) ? `${p.slice(2, 4)}Q${p.slice(5)}` : `${+p.slice(5)}月`;
let view = {t: 'm', p: CUR.m};

/* ================= 静态指标定义 ================= */
const COUNTIES = ['A区','B县','C市','D县','E区','F县'];
const COUNTY_BASE = [4.6, 2.9, 2.0, 1.4, 0.9, 0.3];
const METRICS = [
  {name:'进口值', mod:'进出口业务', unit:'亿元', agg:'sum', base:4.4, g:.07},
  {name:'出口值', mod:'进出口业务', unit:'亿元', agg:'sum', base:6.8, g:.10},
  {name:'关税', mod:'税收入库', unit:'亿元', agg:'sum', base:.36, g:.04},
  {name:'进口环节税', mod:'税收入库', unit:'亿元', agg:'sum', base:1.0, g:.06},
  {name:'其他税费', mod:'税收入库', unit:'亿元', agg:'sum', base:.19, g:.03},
  {name:'加工贸易进出口', mod:'加贸保税', unit:'亿元', agg:'sum', base:3.1, g:.07},
  {name:'保税物流', mod:'加贸保税', unit:'亿元', agg:'sum', base:1.8, g:.11},
  {name:'在册加工贸易企业', mod:'加贸保税', unit:'家', agg:'snap', int:true, base:405, g:.01},
  {name:'跨境电商', mod:'新兴业态', unit:'票', agg:'sum', int:true, base:150000, g:.12},
  {name:'快件', mod:'新兴业态', unit:'票', agg:'sum', int:true, base:80000, g:.08},
  {name:'邮件', mod:'新兴业态', unit:'件', agg:'sum', int:true, base:45000, g:.05},
  {name:'进出境旅客', mod:'进出境旅客及运输工具', unit:'人次', agg:'sum', int:true, base:105000, g:.08},
  {name:'船舶', mod:'进出境旅客及运输工具', unit:'艘次', agg:'sum', int:true, base:320, g:.03},
  {name:'航空器', mod:'进出境旅客及运输工具', unit:'架次', agg:'sum', int:true, base:1150, g:.05},
  {name:'车辆', mod:'进出境旅客及运输工具', unit:'辆次', agg:'sum', int:true, base:19500, g:.04},
  {name:'累计备案', mod:'报关单位备案', unit:'家', agg:'snap', int:true, base:5300, g:.02},
  {name:'本期新增备案', mod:'报关单位备案', unit:'家', agg:'sum', int:true, base:105, g:.02},
  {name:'本期注销备案', mod:'报关单位备案', unit:'家', agg:'sum', int:true, base:15, g:.01},
  ...COUNTIES.map((c, i) => ({name:'县区外贸·' + c, mod:'某地各县区外贸', unit:'亿元', agg:'sum', base:COUNTY_BASE[i], g:.06}))
];
const M = {};
METRICS.forEach(m => M[m.name] = m);
M['进出口总值'] = {name:'进出口总值', unit:'亿元', derived:['进口值','出口值']};
M['税收入库总额'] = {name:'税收入库总额', unit:'亿元', derived:['关税','进口环节税','其他税费']};

const rnd = s => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x) };
let VAL = {};
METRICS.forEach((mt, mi) => {
  VAL[mt.name] = {};
  ALL_MONTHS.forEach((mo, i) => {
    const wave = 1 + 0.05 * Math.sin(i * 1.3 + mi) + 0.03 * (rnd(i + mi * 31) - .5);
    const x = mt.agg === 'snap' ? mt.base * (1 + .012 * i) * wave : mt.base * Math.pow(1 + mt.g, i / 12) * wave;
    VAL[mt.name][mo] = mt.int ? Math.round(x) : +x.toFixed(2);
  });
});
{ const saved = load('qzui-data-v2', null); if (saved) VAL = saved; }

function raw(n, p){
  const mt = M[n]; if (!mt) return null;
  if (VAL[n] && VAL[n][p] != null) return VAL[n][p];
  if (mt.derived) { const vs = mt.derived.map(x => raw(x, p)); return vs.some(v => v == null) ? null : vs.reduce((a, b) => a + b, 0) }
  if (QRE.test(p)) {
    const ms = qMonths(p).map(m => raw(n, m));
    if (ms.some(v => v == null)) return null;
    return mt.agg === 'snap' ? ms[2] : ms.reduce((a, b) => a + b, 0);
  }
  return null;
}
const yoyOf = (n, p = view.p) => { const v = raw(n, p), pv = raw(n, prevP(p)); return (v == null || !pv) ? null : (v / pv - 1) * 100 };
const yb = n => { const y = yoyOf(n); return y == null ? '' : `<div class="yb ${y >= 0 ? 'up' : 'dn'}">${y >= 0 ? '▲' : '▼'} ${Math.abs(y).toFixed(1)}% 同比</div>` };
const ybSmall = n => { const y = yoyOf(n); return y == null ? '' : `<span class="yb ${y >= 0 ? 'up' : 'dn'}" style="font-size:13px">${y >= 0 ? '▲' : '▼'}${Math.abs(y).toFixed(1)}%</span>` };

/* ================= 图形 ================= */
function legend(items){ return '<div class="legend">' + items.map(([l, c]) => `<span><i style="background:${c}"></i>${esc(l)}</span>`).join('') + '</div>' }

/* 饼图：数据直接写在扇区上；小扇区用引线标在外侧。TH.hole>0 时为环形 */
function pie(items, center){
  const W = 300, H = 180, cx = 150, cy = 90, r = 62, hole = TH.hole || 0, ri = r * hole;
  const tot = items.reduce((a, b) => a + (b.v || 0), 0) || 1;
  const pt = (a, rad) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  let a0 = -Math.PI / 2, body = '', labels = '';
  items.forEach((d, i) => {
    const f = (d.v || 0) / tot, a1 = a0 + f * Math.PI * 2, col = d.c || CL[i % CL.length];
    const tip = `<title>${esc(d.n)}：${fmt(d.v)}${d.u || ''}（${(f * 100).toFixed(1)}%）</title>`;
    if (f > 0.9999) {
      body += hole ? `<circle cx="${cx}" cy="${cy}" r="${(r + ri) / 2}" fill="none" stroke="${col}" stroke-width="${r - ri}">${tip}</circle>` : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}">${tip}</circle>`;
    } else if (f > 0) {
      const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r), [x2, y2] = pt(a1, ri), [x3, y3] = pt(a0, ri), lg = f > .5 ? 1 : 0;
      const dpath = hole
        ? `M${x0},${y0} A${r},${r} 0 ${lg} 1 ${x1},${y1} L${x2},${y2} A${ri},${ri} 0 ${lg} 0 ${x3},${y3} Z`
        : `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${lg} 1 ${x1},${y1} Z`;
      body += `<path d="${dpath}" fill="${col}" stroke="${TH.sep}" stroke-width="2">${tip}</path>`;
    }
    const am = (a0 + a1) / 2, pct = (f * 100).toFixed(1) + '%';
    if (f >= 0.1) {
      const [tx, ty] = pt(am, hole ? (r + ri) / 2 : r * 0.62);
      const lines = [d.n, cfmt(d.v)]; if (f >= 0.22) lines.push(pct);
      const y0t = ty - (lines.length - 1) * 7;
      labels += `<text text-anchor="middle" fill="#fff" font-size="12" font-weight="600" style="paint-order:stroke;stroke:rgba(0,0,0,.28);stroke-width:2px">${lines.map((t, k) => `<tspan x="${tx}" y="${y0t + k * 14}"${k ? ' font-weight="500"' : ''}>${esc(t)}</tspan>`).join('')}</text>`;
    } else if (f > 0) {
      const [lx0, ly0] = pt(am, r), [lx1, ly1] = pt(am, r + 10), right = Math.cos(am) >= 0, tx = lx1 + (right ? 4 : -4);
      labels += `<polyline points="${lx0},${ly0} ${lx1},${ly1} ${tx - (right ? 2 : -2)},${ly1}" fill="none" stroke="${col}" stroke-width="1.2"/>`
        + `<text x="${tx}" y="${ly1 + 4}" text-anchor="${right ? 'start' : 'end'}" fill="var(--fg2)" font-size="12">${esc(d.n)} ${cfmt(d.v)} ${pct}</text>`;
    }
    a0 = a1;
  });
  const ctr = (hole && center != null) ? `<text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="var(--num)" font-size="15" font-weight="700" font-family="Consolas,monospace">${esc(center)}</text>` : '';
  return `<svg class="pie" viewBox="0 0 ${W} ${H}" style="max-width:320px;overflow:visible">${body}${labels}${ctr}</svg>`;
}
const donutBlock = (items, size, center) => pie(items, center);

/* 柱状图 */
function bars(cats, series, h = 150){
  const max = Math.max(...series.flatMap(s => s.v.filter(x => x != null)), 1) * 1.08;
  const showLbl = TH.labels && series.length === 1;
  const fill = c => TH.barGrad ? `linear-gradient(180deg,${c},${c}66)` : c;
  const cols = cats.map((c, i) => `<div class="cg">${series.map(s => { const v = s.v[i]; const hp = v == null ? 0 : v / max * 100; return `<div class="cb" style="height:${hp}%;background:${fill(s.c)}" title="${esc(s.n)} ${esc(c)}：${fmt(v)}">${showLbl ? `<em>${cfmt(v)}</em>` : ''}</div>` }).join('')}</div>`).join('');
  return `<div class="cbar" style="min-height:${h}px;flex:1"><div class="bsw"><div class="bin">${cols}</div></div><div class="xlab">${cats.map(c => `<span>${esc(c)}</span>`).join('')}</div></div>` + (series.length > 1 ? legend(series.map(s => [s.n, s.c])) : '');
}

/* 折线 / 面积图（平滑曲线；TH.fill 控制是否渐变实心填充） */
let gid = 0;
function trend(cats, series, h = 130, opt = {}){
  const n = cats.length, vals = series.flatMap(s => s.v.filter(x => x != null));
  const max = Math.max(...vals, 1) * 1.14;
  const X = i => n > 1 ? 4 + i * 92 / (n - 1) : 50, Y = v => 12 + (1 - v / max) * 84;
  const showVal = opt.labels && series.length <= 2 && n <= 8;
  let defs = '', paths = '', dots = '';
  series.forEach(s => {
    const id = 'g' + (++gid), pts = s.v.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean);
    if (!pts.length) return;
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}` }
    if (TH.fill) {
      defs += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.c}" stop-opacity="${TH.areaOp[0]}"/><stop offset="1" stop-color="${s.c}" stop-opacity="${TH.areaOp[1]}"/></linearGradient>`;
      paths += `<path d="${d} L${pts[pts.length - 1][0]},100 L${pts[0][0]},100 Z" fill="url(#${id})"/>`;
    }
    paths += `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    s.v.forEach((v, i) => { if (v == null) return;
      dots += `<span class="dt" style="left:${X(i)}%;top:${Y(v)}%;border-color:${s.c}" title="${esc(s.n)} ${esc(cats[i])}：${fmt(v)}"></span>`;
      if (showVal) dots += `<em class="vl" style="left:${X(i)}%;top:${Y(v)}%;color:${s.c}">${fmt(v)}</em>`;
    });
  });
  let grid = ''; [0, 1, 2, 3].forEach(i => { const y = 12 + i * 84 / 3; grid += `<line x1="0" x2="100" y1="${y}" y2="${y}" style="stroke:var(--line)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>` });
  return `<div class="trend" style="height:${h}px"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs>${defs}</defs>${grid}${paths}</svg>${dots}</div>`
    + `<div class="tlab">${cats.map((c, i) => `<span style="left:${X(i)}%">${esc(c)}</span>`).join('')}</div>`
    + (series.length > 1 ? legend(series.map(s => [s.n, s.c])) : '');
}
const lines = (cats, series, h) => trend(cats, series, h);

function hbars(items, unit = ''){
  const max = Math.max(...items.map(i => i.v || 0), 1);
  return `<div class="hbars">${items.map((d, i) => `<div class="hb"><span>${esc(d.n)}</span><div class="hbt"><div style="width:${(d.v || 0) / max * 100}%;background:${d.c || CL[i % CL.length]}"></div></div><b>${fmt(d.v)}${unit}</b></div>`).join('')}</div>`;
}

/* ================= 账号与登录（演示） ================= */
const DEFAULT_USERS = [
  {u:'zh1', name:'综合一处管理员', dept:'综合一处', pwd:'123456', role:'admin'},
  {u:'zh2', name:'综合二处管理员', dept:'综合二处', pwd:'123456', role:'admin'},
  {u:'viewer', name:'普通查看人员', dept:'业务科室', pwd:'123456', role:'viewer'}
];
let USERS = load('qzui-users-v2', DEFAULT_USERS);
let session = null;
const isAdmin = () => !!session && session.role === 'admin';
const adminCount = () => USERS.filter(x => x.role === 'admin').length;

function renderHeader(){
  const sw = (TH.switch || []).map(([n, f, id]) => `<a href="${f}" class="${id === TH.id ? 'on' : ''}">${n}</a>`).join('');
  $('#hright').innerHTML = (sw ? `<span class="sw">${sw}</span>` : '')
    + (session ? `<span class="who">${esc(session.name)}</span><span class="tag-role">${isAdmin() ? '管理员' : '普通查看'}</span>` : '')
    + (isAdmin() ? `<button class="btn-h" data-act="data">数据维护</button><button class="btn-h" data-act="perm">权限管理</button>` : '')
    + (session ? `<button class="btn-h" data-act="logout">退出登录</button>` : `<button class="btn-h solid" data-act="login">管理员登录</button>`)
    + `<span class="clock" id="clock"></span>`;
  tick();
}
$('#hright').onclick = e => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'login') openLogin();
  if (a === 'logout') { session = null; renderHeader(); renderStatic(); toast('已退出登录，当前为普通查看。') }
  if (a === 'data') openData();
  if (a === 'perm') openPerm();
};

/* 弹窗：只有“在遮罩上按下并在遮罩上抬起”才关闭 */
function openModal(title, html, cls = ''){
  $('#ov-title').textContent = title; $('#ov-body').innerHTML = html;
  $('#md').className = 'md ' + cls; $('#ov').hidden = false;
}
function closeModal(){ $('#ov').hidden = true }
$('#ov-x').onclick = closeModal;
let downOnMask = false;
$('#ov').addEventListener('pointerdown', e => { downOnMask = e.target.id === 'ov' });
$('#ov').addEventListener('pointerup', e => { if (downOnMask && e.target.id === 'ov') closeModal(); downOnMask = false });
$('#ov').addEventListener('pointercancel', () => downOnMask = false);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() });

function openLogin(){
  openModal('管理员登录', `
    <div class="login-form">
      <div class="fld"><label for="l-u">账号</label><input class="inp" id="l-u" autocomplete="username"></div>
      <div class="fld"><label for="l-p">密码</label><input class="inp" id="l-p" type="password" autocomplete="current-password"></div>
      <div class="err" id="l-err"></div>
      <div class="acts"><button class="btn" id="l-cancel">取消</button><button class="btn pri" id="l-go">登录</button></div>
      <p class="hint" style="text-align:center">演示账号：zh1、zh2（管理员）、viewer（普通查看）<br>统一密码：123456</p>
    </div>`, 'login');
  $('#l-cancel').onclick = closeModal;
  $('#l-go').onclick = doLogin;
  ['l-u', 'l-p'].forEach(id => $('#' + id).onkeydown = e => { if (e.key === 'Enter') doLogin() });
  setTimeout(() => $('#l-u').focus(), 0);
}
function doLogin(){
  const u = $('#l-u').value.trim(), p = $('#l-p').value, err = $('#l-err');
  const user = USERS.find(x => x.u === u);
  if (!user || user.pwd !== p) { err.textContent = '账号或密码错误'; $('#l-p').value = ''; return }
  session = user;
  closeModal(); renderHeader(); renderStatic();
  toast(`${user.name} 已登录，角色：${user.role === 'admin' ? '管理员' : '普通查看'}。`);
}

/* ---- 数据维护（管理员） ---- */
let PENDING = [];
function openData(){
  if (!isAdmin()) return;
  const last = load('qzui-last-v2', '');
  openModal('数据维护 · 批量导入', `
    <p class="hint">支持 <b>.xlsx</b> 或 <b>.csv</b>（UTF-8）。第一行为表头：<b>模块、指标、周期、数值、单位</b>（单位可不填）。</p>
    <p class="hint">周期格式：月度填 <b>2026-10</b>，季度填 <b>2026Q3</b>。在 Excel 中请把"周期"列设为文本格式，否则 2026-10 可能被自动转成日期（系统会尽量识别，但建议设为文本）。</p>
    <p class="hint">指标名称需与系统一致，如"进口值""关税""县区外贸·A区"等，完整列表见模板。</p>
    <div class="acts" style="justify-content:flex-start">
      <button class="btn" id="d-tpl">下载模板（含当前全部数据）</button>
      <button class="btn danger" id="d-rst">恢复演示数据</button>
    </div>
    <div class="drop"><input type="file" id="d-file" accept=".xlsx,.csv"><div class="hint" style="margin:8px 0 0">上次导入：${esc(last || '无（当前为演示数据）')}</div></div>
    <div id="d-prev"></div>`);
  $('#d-tpl').onclick = downloadTemplate;
  $('#d-rst').onclick = () => { if (confirm('确定恢复为演示数据？已导入的数据将被清除。')) { localStorage.removeItem('qzui-data-v2'); localStorage.removeItem('qzui-last-v2'); location.reload() } };
  $('#d-file').onchange = e => { const f = e.target.files[0]; if (f) onFile(f) };
}
function csvCell(v){ const s = String(v ?? ''); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
function downloadTemplate(){
  const rows = [['模块', '指标', '周期', '数值', '单位']];
  METRICS.forEach(mt => ALL_MONTHS.forEach(mo => { const v = raw(mt.name, mo); if (v != null) rows.push([mt.mod, mt.name, mo, v, mt.unit]) }));
  const txt = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], {type: 'text/csv;charset=utf-8'}));
  a.download = '业务运行监控_数据导入模板.csv';
  a.click();
}
async function onFile(file){
  const prev = $('#d-prev');
  prev.innerHTML = '<p class="hint">正在解析…</p>';
  try {
    let rows;
    if (/\.csv$/i.test(file.name)) rows = parseCsv(await file.text());
    else if (/\.xlsx$/i.test(file.name)) rows = await readXlsx(await file.arrayBuffer());
    else throw new Error('仅支持 .xlsx 或 .csv 文件');
    checkRows(rows);
  } catch (e) {
    prev.innerHTML = `<div class="err" style="text-align:left">解析失败：${esc(e.message)}</div>`;
  }
}
function parseCsv(txt){
  return txt.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()).map(line => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch }
      else if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur.trim()); cur = '' }
      else cur += ch;
    }
    out.push(cur.trim()); return out;
  });
}
async function readXlsx(buf){
  const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let e = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { e = i; break } }
  if (e < 0) throw new Error('不是有效的 .xlsx 文件');
  const cnt = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const files = {};
  for (let n = 0; n < cnt; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
    files[name] = {method, data: u8.subarray(start, start + csize)};
    p += 46 + nl + el + cl;
  }
  const text = async name => {
    const f = files[name]; if (!f) return null;
    if (f.method === 0) return dec.decode(f.data);
    if (f.method !== 8) throw new Error('不支持的压缩方式');
    const s = new Blob([f.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(s).text();
  };
  const sst = [];
  const sstXml = await text('xl/sharedStrings.xml');
  if (sstXml) {
    const d = new DOMParser().parseFromString(sstXml, 'application/xml');
    Array.from(d.getElementsByTagName('si')).forEach(si => sst.push(Array.from(si.getElementsByTagName('t')).map(t => t.textContent).join('')));
  }
  const sheet = Object.keys(files).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  if (!sheet) throw new Error('找不到工作表');
  const colIndex = ref => { const m = /^([A-Z]+)/.exec(ref || 'A'); let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1 };
  const d = new DOMParser().parseFromString(await text(sheet), 'application/xml');
  return Array.from(d.getElementsByTagName('row')).map(row => {
    const arr = [];
    Array.from(row.getElementsByTagName('c')).forEach(c => {
      const col = colIndex(c.getAttribute('r')), t = c.getAttribute('t');
      let v = '';
      if (t === 's') v = sst[+(c.getElementsByTagName('v')[0]?.textContent || 0)] ?? '';
      else if (t === 'inlineStr') v = Array.from(c.getElementsByTagName('t')).map(x => x.textContent).join('');
      else { const vv = c.getElementsByTagName('v')[0]; v = vv ? vv.textContent : '' }
      arr[col] = v;
    });
    return Array.from({length: arr.length}, (_, i) => arr[i] ?? '');
  });
}
function normPeriod(s){
  s = String(s).trim();
  if (/^\d{5}$/.test(s) && +s > 40000 && +s < 60000) { const d = new Date(Date.UTC(1899, 11, 30) + (+s) * 864e5); s = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}` }
  let m = /^(\d{4})[-/.年]\s*(\d{1,2})月?$/.exec(s);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${String(m[2]).padStart(2, '0')}`;
  m = /^(\d{4})\s*-?\s*Q([1-4])$/i.exec(s);
  if (m) return `${m[1]}Q${m[2]}`;
  return null;
}
function checkRows(rows){
  if (!rows.length) throw new Error('文件为空');
  const head = rows[0].map(x => String(x).trim());
  const ci = {}; ['模块', '指标', '周期', '数值', '单位'].forEach(h => ci[h] = head.indexOf(h));
  const miss = ['指标', '周期', '数值'].filter(h => ci[h] < 0);
  if (miss.length) throw new Error('表头缺少列：' + miss.join('、'));
  PENDING = rows.slice(1).filter(r => r.some(x => String(x).trim() !== '')).map((r, i) => {
    const g = h => ci[h] >= 0 ? String(r[ci[h]] ?? '').trim() : '';
    const name = g('指标'), pRaw = g('周期'), vRaw = g('数值');
    const per = normPeriod(pRaw), mt = M[name];
    let err = '';
    if (!mt) err = '指标名称不在系统中';
    else if (mt.derived) err = '该指标由其他指标汇总，无需导入';
    else if (!per) err = '周期格式应为 2026-10 或 2026Q3';
    else if (vRaw === '' || !isFinite(Number(vRaw))) err = '数值不是有效数字';
    return {line: i + 2, name, per: per || pRaw, raw: vRaw, v: Number(vRaw), err};
  });
  renderPreview();
}
function renderPreview(){
  const ok = PENDING.filter(x => !x.err).length, bad = PENDING.length - ok;
  $('#d-prev').innerHTML = `
    <div class="sum">共 ${PENDING.length} 条：<span class="tag ok">有效 ${ok}</span><span class="tag bad">错误 ${bad}</span>${PENDING.length > 300 ? '<span class="note">仅预览前 300 行</span>' : ''}</div>
    <div class="scroll tw"><table><tr><th>行号</th><th>指标</th><th>周期</th><th>数值</th><th>状态</th></tr>
    ${PENDING.slice(0, 300).map(x => `<tr><td>${x.line}</td><td>${esc(x.name)}</td><td>${esc(x.per)}</td><td>${esc(x.raw)}</td><td>${x.err ? `<span class="tag bad">${esc(x.err)}</span>` : '<span class="tag ok">有效</span>'}</td></tr>`).join('')}
    </table></div>
    <div class="acts"><button class="btn pri" id="d-imp" ${ok ? '' : 'disabled'}>导入 ${ok} 条有效数据</button></div>`;
  const b = $('#d-imp'); if (b) b.onclick = doImport;
}
function doImport(){
  const valid = PENDING.filter(x => !x.err);
  valid.forEach(x => { if (!VAL[x.name]) VAL[x.name] = {}; VAL[x.name][x.per] = x.v });
  save('qzui-data-v2', VAL);
  save('qzui-last-v2', new Date().toLocaleString('zh-CN', {hour12: false}));
  PENDING = [];
  renderStatic();
  $('#d-prev').innerHTML = `<div class="sum"><span class="tag ok">已导入 ${valid.length} 条，静态数据已更新。</span></div>`;
}

/* ---- 权限管理（管理员） ---- */
function openPerm(){
  if (!isAdmin()) return;
  openModal('权限管理 · 账号与角色分配', `
    <p class="hint">管理员（综合一处、综合二处）负责数据维护与权限分配；普通查看人员仅可查看数据、跳转现场平台，不可修改数据。</p>
    <div class="scroll tw"><table id="ut"></table></div>
    <h4 style="margin:18px 0 6px;color:var(--head)">新增账号</h4>
    <div class="urow">
      <div class="fld"><label>账号</label><input class="inp" id="n-u"></div>
      <div class="fld"><label>姓名</label><input class="inp" id="n-name"></div>
      <div class="fld"><label>部门</label><input class="inp" id="n-dept"></div>
      <div class="fld"><label>初始密码</label><input class="inp" id="n-pwd" value="123456"></div>
      <div class="fld"><label>角色</label><select class="pick" id="n-role"><option value="viewer">普通查看</option><option value="admin">管理员</option></select></div>
      <div class="fld"><label>&nbsp;</label><button class="btn pri" id="n-add">添加</button></div>
    </div>
    <div class="err" id="p-err" style="text-align:left"></div>`);
  drawUsers();
  $('#n-add').onclick = () => {
    const u = $('#n-u').value.trim(), name = $('#n-name').value.trim(), dept = $('#n-dept').value.trim(), pwd = $('#n-pwd').value, role = $('#n-role').value;
    const err = $('#p-err');
    if (!u || !name || !pwd) { err.textContent = '账号、姓名、初始密码必填'; return }
    if (USERS.some(x => x.u === u)) { err.textContent = '该账号已存在'; return }
    USERS.push({u, name, dept, pwd, role}); save('qzui-users-v2', USERS);
    ['n-u', 'n-name', 'n-dept'].forEach(id => $('#' + id).value = '');
    err.textContent = ''; drawUsers();
  };
}
function drawUsers(){
  const t = $('#ut');
  t.innerHTML = `<tr><th>账号</th><th>姓名</th><th>部门</th><th>角色</th><th>操作</th></tr>` + USERS.map((u, i) => `
    <tr><td>${esc(u.u)}</td><td>${esc(u.name)}</td><td>${esc(u.dept)}</td>
    <td><select class="pick" data-i="${i}"><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>管理员</option><option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>普通查看</option></select></td>
    <td><button class="btn sm danger" data-del="${i}">删除</button></td></tr>`).join('');
  t.onchange = e => {
    const s = e.target.closest('select[data-i]'); if (!s) return;
    const i = +s.dataset.i;
    if (USERS[i].role === 'admin' && s.value !== 'admin' && adminCount() <= 1) { $('#p-err').textContent = '至少保留一名管理员'; s.value = 'admin'; return }
    USERS[i].role = s.value; save('qzui-users-v2', USERS); $('#p-err').textContent = '';
    if (session && session.u === USERS[i].u) session = USERS[i];
    renderHeader(); renderStatic();
  };
  t.onclick = e => {
    const b = e.target.closest('button[data-del]'); if (!b) return;
    const i = +b.dataset.del;
    if (USERS[i].role === 'admin' && adminCount() <= 1) { $('#p-err').textContent = '至少保留一名管理员，不能删除'; return }
    if (session && session.u === USERS[i].u) session = null;
    USERS.splice(i, 1); save('qzui-users-v2', USERS);
    drawUsers(); renderHeader(); renderStatic();
  };
}

/* ================= 静态区 ================= */
function renderPeriodPick(){
  const list = view.t === 'm' ? ALL_MONTHS.slice().reverse() : ALL_QUARTERS.slice().reverse();
  $('#pick').innerHTML = list.map(p => `<option value="${p}" ${p === view.p ? 'selected' : ''}>${periodLabel(p)}</option>`).join('');
  document.querySelectorAll('#seg button').forEach(b => b.classList.toggle('on', b.dataset.t === view.t));
}
$('#seg').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  view = {t: b.dataset.t, p: CUR[b.dataset.t]};
  renderPeriodPick(); renderStatic();
};
$('#pick').onchange = e => { view.p = e.target.value; renderStatic() };

function renderStatic(){
  const p = view.p, N = view.t === 'm' ? 6 : 4;
  const cats = view.t === 'm' ? ALL_MONTHS : ALL_QUARTERS;
  const idx = cats.indexOf(p);
  const win = cats.slice(Math.max(0, idx - N + 1), idx + 1);
  const sr = n => win.map(x => raw(n, x));
  const v = n => raw(n, p);
  const kpi = (label, name) => `<div><div class="kl">${label}</div><div class="kn">${fmt(v(name))}<u>${M[name].unit}</u></div>${yb(name)}</div>`;

  $('#ptitle').textContent = `静态业务数据 · ${periodLabel(p)}（${view.t === 'm' ? '月度' : '季度'}）`;
  $('#pmeta').textContent = `统计周期：${periodRange(p)}　·　同比为与上年同期对比`;

  const taxItems = [{n:'关税', v:v('关税'), c:CL[0]}, {n:'进口环节税', v:v('进口环节税'), c:CL[1]}, {n:'其他税费', v:v('其他税费'), c:CL[2]}];
  const emerg = [{n:'跨境电商', v:v('跨境电商'), u:'票', c:CL[0]}, {n:'快件', v:v('快件'), u:'票', c:CL[1]}, {n:'邮件', v:v('邮件'), u:'件', c:CL[2]}];
  const counties = COUNTIES.map(c => ({n:c, v:v('县区外贸·' + c)})).sort((a, b) => (b.v || 0) - (a.v || 0));
  const ieSeries = [{n:'进口', c:CL[0], v:sr('进口值')}, {n:'出口', c:CL[1], v:sr('出口值')}];
  const ieChart = TH.area ? trend(win.map(shortLabel), ieSeries, 200, {labels:true}) : bars(win.map(shortLabel), ieSeries, 190);

  $('#static').innerHTML = `
  <div class="card j"><div class="ch"><b>① 进出口业务</b><i>亿元</i></div>
    <div class="cbody">
      <div class="kpis">${kpi('进出口总值', '进出口总值')}${kpi('进口', '进口值')}${kpi('出口', '出口值')}</div>
      ${ieChart}
    </div></div>

  <div class="card s"><div class="ch"><b>② 税收入库</b><i>亿元</i></div>
    <div class="cbody">
      <div class="kpis">${kpi('入库总额', '税收入库总额')}</div>
      ${pie(taxItems, fmt(v('税收入库总额')))}
      <div class="legend" style="gap:6px 16px;font-size:15px;margin-top:0">${['关税','进口环节税','其他税费'].map(n => `<span>${n} ${ybSmall(n)}</span>`).join('')}</div>
    </div></div>

  <div class="card s"><div class="ch"><b>③ 加贸保税</b><i>亿元</i></div>
    <div class="cbody">
      <div class="kpis">${kpi('加工贸易进出口', '加工贸易进出口')}${kpi('保税物流', '保税物流')}</div>
      <div><div class="kl">在册加工贸易企业</div><div class="kn">${fmt(v('在册加工贸易企业'))}<u>家</u></div>${yb('在册加工贸易企业')}</div>
      <div>${hbars([{n:'加工贸易', v:v('加工贸易进出口')}, {n:'保税物流', v:v('保税物流')}], ' 亿元')}</div>
    </div></div>

  <div class="card s"><div class="ch"><b>④ 新兴业态</b><i>跨境电商 · 快件 · 邮件</i></div>
    <div class="cbody">
      ${pie(emerg, '3类')}
      <div>${emerg.map(d => `<div class="kl" style="display:flex;justify-content:space-between;padding:4px 0">${d.n}<span>${fmt(d.v)}${d.u} ${ybSmall(d.n)}</span></div>`).join('')}</div>
    </div></div>

  <div class="card s"><div class="ch"><b>⑤ 进出境旅客及运输工具</b></div>
    <div class="cbody">
      <div class="cards2">
        ${[['进出境旅客', '人次', '进出境旅客'], ['船舶', '艘次', '船舶'], ['航空器', '架次', '航空器'], ['车辆', '辆次', '车辆']].map(([l, u, n]) => `<div class="mini"><div class="n">${fmt(v(n))}</div><div class="l">${l}（${u}）</div>${ybSmall(n)}</div>`).join('')}
      </div>
    </div></div>

  <div class="card s"><div class="ch"><b>⑥ 报关单位备案</b><i>家</i></div>
    <div class="cbody">
      <div class="kpis">${kpi('累计备案', '累计备案')}${kpi('本期新增', '本期新增备案')}${kpi('本期注销', '本期注销备案')}</div>
      ${bars(win.map(shortLabel), [{n:'新增', c:CL[0], v:sr('本期新增备案')}, {n:'注销', c:CL[3], v:sr('本期注销备案')}], 130)}
    </div></div>

  <div class="card s"><div class="ch"><b>⑦ 某地各县区外贸数据</b><i>进出口值 · 亿元</i></div>
    <div class="cbody">${hbars(counties, ' 亿元')}</div></div>`;
}

/* ================= 动态：石化信息管理平台（演示数据） ================= */
const SH = {ships:1286, cargo:3482.6, value:218.4,
  status:[{n:'在港', v:46, c:CL[0]}, {n:'靠泊', v:31, c:CL[1]}, {n:'离港', v:23, c:CL[4]}],
  ie:[{n:'进口', v:68, c:CL[0]}, {n:'出口', v:32, c:CL[2]}],
  quays:[{n:'1号', v:18}, {n:'2号', v:14}, {n:'3号', v:11}, {n:'4号', v:9}, {n:'5号', v:6}],
  zones:[{n:'片区一', v:512}, {n:'片区二', v:431}, {n:'片区三', v:343}]};
const CAL_DATA = {3:['1号码头：装船 2 艘','3号码头：卸货 1 艘'], 8:['2号码头：靠泊作业 3 艘'], 12:['1号码头：装船 1 艘','4号码头：检修'], 13:['2号码头：卸货 2 艘','5号码头：装船 1 艘'], 18:['3号码头：靠泊 2 艘'], 21:['1号码头：装卸 4 艘'], 26:['4号码头：装船 2 艘']};
let calSel = 13;
function renderShihua(){
  $('#p-sh').innerHTML = `
  <div class="ph" data-go="shihua" data-name="石化信息管理平台"><h3><span class="dot"></span>石化信息管理平台</h3><span class="go">进入平台 ›</span></div>
  <div class="pb">
    <div class="cards3">
      <div class="mini"><div class="n">${fmt(SH.ships)}</div><div class="l">船舶总量（艘）</div></div>
      <div class="mini"><div class="n">${fmt(SH.cargo)}</div><div class="l">货运量（万吨）</div></div>
      <div class="mini"><div class="n">${SH.value}</div><div class="l">货值（亿元）</div></div></div>
    <div class="sub"><h4>管辖片区 · 船舶总量</h4>${hbars(SH.zones, ' 艘')}</div>
    <div class="row2">
      <div class="sub"><h4>船舶靠港情况</h4>${pie(SH.status)}</div>
      <div class="sub"><h4>进出口标志</h4>${pie(SH.ie)}</div></div>
    <div class="sub"><h4>各码头船舶数</h4>${bars(SH.quays.map(q => q.n), [{n:'船舶', c:CL[0], v:SH.quays.map(q => q.v)}], 130)}</div>
    <div class="sub"><h4>码头作业日历 · 2026年11月（点击日期查看）</h4><div class="cal" id="cal"></div><div class="daybox" id="daybox"></div></div>
  </div>`;
  renderCal();
}
function renderCal(){
  const first = (new Date(2026, 10, 1).getDay() + 6) % 7;
  let h = ['一','二','三','四','五','六','日'].map(x => `<div class="wk">${x}</div>`).join('');
  for (let i = 0; i < first; i++) h += '<button class="blank"></button>';
  for (let d = 1; d <= 30; d++) h += `<button data-d="${d}" class="${CAL_DATA[d] ? 'has' : ''} ${d === calSel ? 'sel' : ''}">${d}</button>`;
  $('#cal').innerHTML = h;
  const L = CAL_DATA[calSel];
  $('#daybox').innerHTML = `<b style="color:var(--fg)">11月${calSel}日</b>　` + (L ? L.join('；') : '当日无作业安排');
  $('#cal').onclick = e => { const b = e.target.closest('button[data-d]'); if (b) { calSel = +b.dataset.d; renderCal() } };
}

/* ================= 动态：陆地港非贸业务可视化平台（演示数据） ================= */
const LP = {
  cards:[['在库数','12,860'], ['当日过机数','4,215'], ['累计过机数','1,286,540'], ['15天未过机','137','bad'], ['待查验','382'], ['查验异常','26','bad']],
  share:[{n:'快件', v:46200, c:CL[1]}, {n:'跨境电商', v:71800, c:CL[0]}, {n:'邮件', v:18500, c:CL[2]}],
  months:['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月'],
  trend:[{n:'跨境电商', c:CL[0], v:[52,48,60,66,71,69,74,80,77,85]}, {n:'快件', c:CL[1], v:[30,26,34,38,41,40,44,47,45,50]}, {n:'邮件', c:CL[2], v:[12,10,13,15,17,16,18,19,18,21]}],
  flow:[{n:'华东', v:38200}, {n:'华南', v:29100}, {n:'华北', v:17600}, {n:'西南', v:9800}, {n:'华中', v:6400}],
  freq:[
    ['阿不都热依木','新疆维吾尔自治区喀什地区喀什市解放南路188号2号楼3单元1202室','138****2071','37次'],
    ['Abdulrahman Khan','新疆维吾尔自治区伊犁哈萨克自治州伊宁市解放路66号华园小区12栋2单元1501室','139****8830','29次'],
    ['张**','XX市XX路12号','138****2071','37次'], ['李**','XX县XX镇5号','139****8830','29次'],
    ['王**','XX区XX街88号','136****5512','24次'], ['赵**','XX市XX路6号','158****4096','21次'],
    ['陈**','XX区XX大道18号','137****1024','19次'], ['刘**','XX县XX路31号','150****6732','18次'],
    ['周**','XX市XX巷9号','186****3105','17次'], ['吴**','XX区XX街26号','135****9481','16次'],
    ['郑**','XX县XX道7号','159****2216','15次'], ['孙**','XX市XX路45号','132****7083','14次'],
    ['胡**','XX区XX街63号','187****4520','13次'], ['朱**','XX县XX路14号','151****8964','12次'],
    ['高**','XX市XX大道22号','133****5701','11次'], ['林**','XX区XX巷3号','188****1649','10次'],
    ['何**','XX县XX街52号','152****4378','9次'], ['郭**','XX市XX路71号','139****6825','8次'],
    ['马**','XX区XX道16号','183****2954','7次'], ['罗**','XX县XX街28号','156****7310','6次'],
    ['梁**','XX市XX路39号','131****5086','5次'], ['宋**','XX区XX巷11号','177****9432','4次']
  ],
  veh:[
    ['浙A·***01','A口岸','12','进'], ['浙A·***02','B口岸','8','出'],
    ['浙C·***03','A口岸','15','进'], ['浙C·***04','C口岸','6','出'],
    ['浙B·***05','B口岸','9','进'], ['浙D·***06','A口岸','11','出'],
    ['浙E·***07','C口岸','7','进'], ['浙F·***08','B口岸','14','出'],
    ['浙A·***09','C口岸','5','进'], ['浙C·***10','A口岸','10','出'],
    ['浙B·***11','B口岸','13','进'], ['浙D·***12','C口岸','4','出'],
    ['浙E·***13','A口岸','16','进'], ['浙F·***14','B口岸','8','出'],
    ['浙A·***15','C口岸','6','进'], ['浙C·***16','A口岸','12','出'],
    ['浙B·***17','B口岸','9','进'], ['浙D·***18','C口岸','7','出'],
    ['浙E·***19','A口岸','11','进'], ['浙F·***20','B口岸','5','出']
  ]
};
function renderLand(){
  $('#p-lp').innerHTML = `
  <div class="ph" data-go="landport" data-name="陆地港非贸业务可视化平台"><h3><span class="dot"></span>陆地港非贸业务可视化平台</h3><span class="go">进入平台 ›</span></div>
  <div class="pb">
    <div class="cards3">${LP.cards.map(c => `<div class="mini"><div class="n" ${c[2] ? 'style="color:var(--dn)"' : ''}>${c[1]}</div><div class="l">${c[0]}</div></div>`).join('')}</div>
    <div class="row2">
      <div class="sub"><h4>业务占比</h4>${pie(LP.share)}</div>
      <div class="sub"><h4>进境快件流向（按区域量）</h4>${hbars(LP.flow)}</div></div>
    <div class="sub"><h4>各业务趋势 · 本年（万票）</h4>${trend(LP.months, LP.trend, 150)}</div>
    <div class="sub"><h4>高频信息监控</h4><div class="tw"><table><tr><th>姓名</th><th>地址</th><th>联系方式</th><th>频次</th></tr>${LP.freq.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><span class="tag bad">${r[3]}</span></td></tr>`).join('')}</table></div></div>
    <div class="sub"><h4>当日转关车辆监控</h4><div class="tw"><table><tr><th>车牌号</th><th>始发地</th><th>票数</th><th>进/出</th></tr>${LP.veh.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><span class="tag">${r[3]}</span></td></tr>`).join('')}</table></div></div>
  </div>`;
}

/* ================= 动态：空港旅检信息管理平台（演示数据） ================= */
const AP = {
  dev:[{n:'X光机', v:24}, {n:'金属探测门', v:18}, {n:'痕量探测仪', v:9}, {n:'人脸识别', v:12}],
  today:[{n:'行李数量', v:18420, c:CL[0]}, {n:'预警数量', v:137, c:CL[3]}],
  devOv:{c:['在线','离线','检修'], v:[52, 4, 7]},
  bag:{c:['6-9时','9-12时','12-15时','15-18时','18-21时'], v:[2100, 5300, 4100, 3900, 3020]},
  clear:{c:['入境','查验','放行','移交'], v:[6210, 860, 5740, 42]}
};
function scene3d(){
  const g = (x, y, c) => `<polygon points="${x},${y} ${x + 34},${y - 17} ${x + 68},${y} ${x + 34},${y + 17}" fill="${c}" opacity=".9"/>`;
  return `<svg viewBox="0 0 360 150" width="100%" height="150" preserveAspectRatio="xMidYMid meet"><rect width="360" height="150" fill="${TH.sceneBg}" rx="6"/>
    ${g(40,100,CL[1])}${g(120,80,CL[2])}${g(200,100,CL[4])}${g(260,70,CL[0])}${g(160,120,CL[0])}
    <polygon points="30,112 330,112 340,128 20,128" fill="${TH.road}"/>
    <text x="180" y="30" text-anchor="middle" font-size="13" fill="var(--fg3)">空港旅检现场 3D 模拟（示意）</text></svg>`;
}
function renderAir(){
  const totalDev = AP.dev.reduce((a, b) => a + b.v, 0);
  $('#p-ap').innerHTML = `
  <div class="ph" data-go="airport" data-name="空港旅检信息管理平台"><h3><span class="dot"></span>空港旅检信息管理平台</h3><span class="go">进入平台 ›</span></div>
  <div class="pb">
    <div class="sub"><h4>现场 3D 模拟图</h4>${scene3d()}</div>
    <div class="row2">
      <div class="sub"><h4>设备数量 · 共 ${totalDev} 台</h4>${hbars(AP.dev, ' 台')}</div>
      <div class="sub"><h4>今日提示</h4>${pie(AP.today)}</div></div>
    <div class="sub"><h4>设备总览数据</h4>${bars(AP.devOv.c, [{n:'设备', c:CL[0], v:AP.devOv.v}], 120)}</div>
    <div class="sub"><h4>今日行李数据</h4>${bars(AP.bag.c, [{n:'行李', c:CL[1], v:AP.bag.v}], 120)}</div>
    <div class="sub"><h4>进境通关总览数据</h4>${bars(AP.clear.c, [{n:'人次', c:CL[4], v:AP.clear.v}], 120)}</div>
    <div class="btns"><button class="btn" data-go="airport" data-name="空港旅检 · 预警管理">预警管理 ›</button><button class="btn" data-go="airport" data-name="空港旅检 · 指令维护">指令维护 ›</button></div>
  </div>`;
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-go]'); if (el) go(el.dataset.go, el.dataset.name);
});

/* ================= 时钟与初始化 ================= */
function tick(){
  const el = $('#clock'); if (!el) return;
  const d = new Date(), p = n => String(n).padStart(2, '0');
  el.textContent = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
setInterval(tick, 1000);
renderHeader();
renderPeriodPick();
renderStatic();
renderShihua();
renderLand();
renderAir();
