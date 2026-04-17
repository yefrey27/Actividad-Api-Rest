/**
 * ANIMEX — app.js
 * Solo campos confirmados de Jikan API v4
 *
 * /anime/{id}/full  →  title, title_japanese, type, score, rank, popularity,
 *   members, favorites, episodes, status, aired, year, season, duration,
 *   rating, source, synopsis, background, studios, producers, licensors,
 *   genres, themes, demographics, relations, streaming, external,
 *   trailer.youtube_id, theme.openings, theme.endings, images
 *
 * /anime/{id}/characters  →  character (name, images), role, voice_actors
 * /anime/{id}/staff       →  person (name, images), positions
 * /top/anime              →  score, rank, popularity, members, favorites, type, episodes
 * /seasons/now            →  mismos campos de /anime pero paginado
 * /anime?q=               →  búsqueda paginada
 */

'use strict';

/* ── CONFIG ───────────────────────────────────── */
const API      = 'https://api.jikan.moe/v4';
const RATE_MS  = 420;   // ~2.4 req/s (límite seguro de Jikan)
const DEBOUNCE = 650;   // ms búsqueda en tiempo real
const TTL      = 5 * 60 * 1000; // caché en memoria 5 min

/* ── CACHÉ EN MEMORIA ─────────────────────────── */
const _cache = new Map();

async function api(path) {
  if (_cache.has(path)) {
    const h = _cache.get(path);
    if (Date.now() - h.t < TTL) return h.d;
  }
  const wait = Math.max(0, RATE_MS - (Date.now() - (api._last || 0)));
  if (wait) await ms(wait);
  api._last = Date.now();

  const r = await fetch(API + path);
  if (r.status === 429) { await ms(1200); return api(path); }
  if (!r.ok) throw new Error(`Error ${r.status}`);
  const d = await r.json();
  _cache.set(path, { d, t: Date.now() });
  return d;
}

const ms   = n => new Promise(r => setTimeout(r, n));
const esc  = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
const cut  = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
const big  = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(Math.round(n));

/* ── ESTADO ───────────────────────────────────── */
const S = {
  sec: 'search',
  search: { q:'', type:'', score:'', order:'', page:1, hasNext:false, total:0 },
  top:    { filter:'', page:1, items:[], hasNext:false, busy:false },
  season: { done:false },
  stats:  { done:false },
  favs:   loadFavs(),
  charts: {},
  dbt:    null,
};

/* ── DOM ──────────────────────────────────────── */
const $  = id => document.getElementById(id);
const $$ = s  => document.querySelectorAll(s);

const D = {
  hdr:    $('hdr'), nav:    $('nav'), hbtn:   $('hbtn'),
  fc:     $('fc'),  si:     $('si'),  sbtn:   $('sbtn'),
  ft:     $('ft'),  fsc:    $('fsc'), fo:     $('fo'),
  cf:     $('cf'),  sr:     $('sr'),
  rh:     $('rh'),  rt:     $('rt'),  rc:     $('rc'),
  pag:    $('pag'), pp:     $('pp'),  np:     $('np'),  pi: $('pi'),
  tr:     $('tr'),  tf:     $('tf'),  lm:     $('lm'),
  seasr:  $('seasr'), stag: $('stag'),
  kAvg:   $('kAvg'), kMax:  $('kMax'), kEps: $('kEps'),
  kMem:   $('kMem'), kTV:   $('kTV'),  kMov: $('kMov'),
  rls:    $('rls'),
  fempty: $('fempty'), favgrid: $('favgrid'),
  clrFavs:$('clrFavs'),
  mov:    $('mov'), mclose: $('mclose'), minner: $('minner'),
  toasts: $('toasts'),
  cur:    $('cur'),  curDot: $('curDot'),
};

/* ── CURSOR ───────────────────────────────────── */
document.addEventListener('mousemove', e => {
  D.cur.style.cssText    = `left:${e.clientX}px;top:${e.clientY}px`;
  D.curDot.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
}, { passive:true });
document.addEventListener('mouseover', e => {
  if (e.target.closest('button,a,.card,select,input,.mchar,.mrel')) D.cur.classList.add('hov');
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('button,a,.card,select,input,.mchar,.mrel')) D.cur.classList.remove('hov');
});

/* ── NAV ──────────────────────────────────────── */
$$('.nb[data-s]').forEach(b => b.addEventListener('click', () => goSec(b.dataset.s)));
D.hbtn.addEventListener('click', () => D.nav.classList.toggle('open'));
window.goSec = goSec;

function goSec(name) {
  D.nav.classList.remove('open');
  $$('.nb[data-s]').forEach(b => b.classList.toggle('active', b.dataset.s === name));
  $$('.sec').forEach(s => s.classList.remove('active'));
  $(`sec-${name}`)?.classList.add('active');
  S.sec = name;
  if (name === 'top'    && !S.top.items.length) loadTop();
  if (name === 'season' && !S.season.done)      loadSeason();
  if (name === 'stats'  && !S.stats.done)       loadStats();
  if (name === 'favs')                           renderFavs();
  window.scrollTo({ top:0, behavior:'smooth' });
}

/* ── TOAST ────────────────────────────────────── */
function toast(msg, type = 'info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', fav:'❤️', unfav:'💔' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]||icons.info}</span> ${msg}`;
  D.toasts.appendChild(el);
  setTimeout(() => {
    el.classList.add('rm');
    el.addEventListener('animationend', () => el.remove(), { once:true });
  }, 2800);
}

/* ── INLINE LOADER ────────────────────────────── */
const il = el => { el.innerHTML = `<div class="il">CARGANDO</div>`; };

/* ── CARD ─────────────────────────────────────── */
function card(a, rank = null, delay = 0) {
  const fav   = isFav(a.mal_id);
  const score = a.score ? a.score.toFixed(1) : 'N/A';
  const eps   = a.episodes ? `${a.episodes} eps` : '? eps';
  const img   = a.images?.jpg?.large_image_url ?? a.images?.jpg?.image_url
              ?? 'https://placehold.co/300x450/10131a/e63946?text=SIN+IMAGEN';
  const air   = a.airing || a.status === 'Currently Airing';

  const el = document.createElement('div');
  el.className   = 'card';
  el.dataset.id  = a.mal_id;
  el.style.animationDelay = `${delay}s`;
  el.innerHTML = `
    <div class="cimg">
      <img src="${esc(img)}" alt="${esc(a.title)}" loading="lazy" decoding="async"/>
      <div class="cov">
        <div class="ovbtns">
          <button class="ob" data-a="detail">Ver más</button>
          <button class="ob sec ${fav?'faved':''}" data-a="fav">${fav?'★':'☆'}</button>
        </div>
      </div>
      ${rank !== null ? `<div class="crank ${rank<=3?'t3':''}">#${rank}</div>` : ''}
      <div class="ctype">${esc(a.type??'ANIME')}</div>
    </div>
    <div class="cbdy">
      <div class="ctitle">${esc(a.title)}</div>
      <div class="cmeta">
        <div class="cscore">${score}</div>
        <div class="ceps">${eps}</div>
      </div>
      ${air ? `<div class="cairing">● En emisión</div>` : ''}
    </div>`;

  el.addEventListener('click', e => {
    const act = e.target.closest('[data-a]')?.dataset.a;
    if (act === 'fav') { e.stopPropagation(); toggleFav(a); refreshFavBtn(el, a.mal_id); }
    else openModal(a.mal_id);
  });
  return el;
}

function refreshFavBtn(el, id) {
  const b = el.querySelector('[data-a="fav"]');
  if (!b) return;
  b.classList.toggle('faved', isFav(id));
  b.textContent = isFav(id) ? '★' : '☆';
}

/* ── BÚSQUEDA ─────────────────────────────────── */
D.sbtn.addEventListener('click',  () => doTrigger(true));
D.si.addEventListener('keydown', e => { if (e.key === 'Enter') doTrigger(true); });
D.si.addEventListener('input', () => {
  clearTimeout(S.dbt);
  const q = D.si.value.trim();
  if (q.length >= 3)  S.dbt = setTimeout(() => doTrigger(true), DEBOUNCE);
  if (!q) { D.sr.innerHTML=''; D.rh.style.display='none'; D.pag.style.display='none'; }
});
[D.ft, D.fsc, D.fo].forEach(x => x.addEventListener('change', () => { if (D.si.value.trim()) doTrigger(true); }));
D.cf.addEventListener('click', () => {
  D.ft.value = D.fsc.value = D.fo.value = '';
  if (D.si.value.trim()) doTrigger(true);
});
D.pp.addEventListener('click', () => { if (S.search.page > 1) { S.search.page--; doSearch(); up(); } });
D.np.addEventListener('click', () => { if (S.search.hasNext) { S.search.page++; doSearch(); up(); } });

function doTrigger(reset = true) {
  const q = D.si.value.trim(); if (!q) return;
  Object.assign(S.search, { q, type:D.ft.value, score:D.fsc.value, order:D.fo.value });
  if (reset) S.search.page = 1;
  doSearch();
}

async function doSearch() {
  const { q, type, score, order, page } = S.search;
  if (!q) return;
  il(D.sr);
  D.rh.style.display = 'flex';
  D.rt.textContent   = `"${q}"`;
  D.pag.style.display = 'none';

  let url = `/anime?q=${encodeURIComponent(q)}&page=${page}&limit=20&sfw`;
  if (type)  url += `&type=${type}`;
  if (score) url += `&min_score=${score}`;
  if (order) url += `&order_by=${order}&sort=desc`;

  try {
    const data  = await api(url);
    const items = data.data ?? [];
    S.search.hasNext = data.pagination?.has_next_page ?? false;
    S.search.total   = data.pagination?.items?.total ?? 0;

    D.sr.innerHTML = '';
    if (!items.length) {
      D.sr.innerHTML = `<div class="err"><strong>Sin resultados</strong>No se encontró nada para "${esc(q)}"</div>`;
      D.rc.textContent = '0 resultados'; return;
    }
    D.rc.textContent = `${S.search.total.toLocaleString('es')} resultados`;
    const f = document.createDocumentFragment();
    items.forEach((a,i) => f.appendChild(card(a, null, i*0.04)));
    D.sr.appendChild(f);

    D.pag.style.display = 'flex';
    D.pi.textContent    = `Página ${page}`;
    D.pp.disabled       = page <= 1;
    D.np.disabled       = !S.search.hasNext;
  } catch(e) {
    D.sr.innerHTML = `<div class="err"><strong>Error</strong>${esc(e.message)}</div>`;
    toast('Error al buscar. Revisa tu conexión.', 'error');
  }
}

/* ── TOP ANIME ────────────────────────────────── */
D.tf.addEventListener('change', () => {
  S.top = { ...S.top, filter:D.tf.value, page:1, items:[], hasNext:false, busy:false };
  D.tr.innerHTML = '';
  loadTop();
});
D.lm.addEventListener('click', () => { if (!S.top.busy) { S.top.page++; loadTop(true); } });

async function loadTop(append = false) {
  if (S.top.busy) return;
  S.top.busy = true;
  if (!append) il(D.tr);

  let url = `/top/anime?page=${S.top.page}&limit=25`;
  if (S.top.filter) url += `&filter=${S.top.filter}`;

  try {
    const data  = await api(url);
    const items = data.data ?? [];
    S.top.hasNext = data.pagination?.has_next_page ?? false;
    if (!append) D.tr.innerHTML = '';
    const start = (S.top.page - 1) * 25 + 1;
    const f = document.createDocumentFragment();
    items.forEach((a,i) => { S.top.items.push(a); f.appendChild(card(a, start+i, i*0.03)); });
    D.tr.appendChild(f);
    D.lm.style.display = S.top.hasNext ? 'inline-block' : 'none';
  } catch(e) {
    D.tr.innerHTML = `<div class="err"><strong>Error</strong>${esc(e.message)}</div>`;
    toast('Error al cargar el ranking.', 'error');
  } finally { S.top.busy = false; }
}

/* ── TEMPORADA ────────────────────────────────── */
async function loadSeason() {
  S.season.done = true;
  il(D.seasr);
  const SEASONS = {1:'Winter',2:'Winter',3:'Spring',4:'Spring',5:'Spring',6:'Summer',7:'Summer',8:'Summer',9:'Fall',10:'Fall',11:'Fall',12:'Winter'};
  const now = new Date();
  D.stag.textContent = `${SEASONS[now.getMonth()+1]} ${now.getFullYear()}`;
  try {
    const data  = await api('/seasons/now?limit=25');
    const items = (data.data ?? []).sort((a,b) => (b.score??0)-(a.score??0));
    D.seasr.innerHTML = '';
    if (!items.length) { D.seasr.innerHTML = `<div class="err"><strong>Sin datos</strong></div>`; return; }
    const f = document.createDocumentFragment();
    items.forEach((a,i) => f.appendChild(card(a, null, i*0.04)));
    D.seasr.appendChild(f);
  } catch(e) {
    D.seasr.innerHTML = `<div class="err"><strong>Error</strong>${esc(e.message)}</div>`;
    toast('Error al cargar la temporada.', 'error');
  }
}

/* ── ESTADÍSTICAS ─────────────────────────────── */
D.rls.addEventListener('click', () => {
  ['/top/anime?page=1&limit=25', '/top/anime?page=2&limit=25'].forEach(k => _cache.delete(k));
  S.stats.done = false;
  destroyCharts();
  loadStats();
});

function destroyCharts() {
  Object.values(S.charts).forEach(c => c?.destroy());
  S.charts = {};
}

async function loadStats() {
  S.stats.done = true;
  ['kAvg','kMax','kEps','kMem','kTV','kMov'].forEach(id => $(id) && ($(id).textContent='…'));

  try {
    // 2 páginas = 50 animes reales del top MAL
    const [p1, p2] = await Promise.all([
      api('/top/anime?page=1&limit=25'),
      api('/top/anime?page=2&limit=25'),
    ]);
    const items = [...(p1.data??[]), ...(p2.data??[])];
    if (!items.length) return;

    // --- KPIs: solo campos que SIEMPRE vienen en /top/anime ---
    const scores  = items.filter(a => a.score > 0).map(a => a.score);
    const eps     = items.filter(a => a.episodes > 0 && a.episodes < 5000).map(a => a.episodes);
    const members = items.filter(a => a.members > 0).map(a => a.members);
    const tvN     = items.filter(a => a.type === 'TV').length;
    const movN    = items.filter(a => a.type === 'Movie').length;
    const avg     = scores.reduce((a,b)=>a+b,0) / scores.length;

    anim(D.kAvg, avg, 2);
    anim(D.kMax, Math.max(...scores), 2);
    anim(D.kEps, eps.reduce((a,b)=>a+b,0), 0);
    anim(D.kMem, members.reduce((a,b)=>a+b,0), 0, true);
    D.kTV.textContent  = tvN;
    D.kMov.textContent = movN;

    destroyCharts();
    buildCharts(items);
  } catch(e) {
    toast('Error al cargar estadísticas: '+e.message, 'error');
    S.stats.done = false;
  }
}

function anim(el, target, dec=0, abbr=false) {
  if (!el) return;
  const dur = 1100;
  const step = ts => {
    if (!step.t0) step.t0 = ts;
    const p   = Math.min((ts - step.t0)/dur, 1);
    const val = target * (1 - Math.pow(1-p, 3));
    el.textContent = abbr ? big(val) : val.toFixed(dec);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = abbr ? big(target) : target.toFixed(dec);
  };
  requestAnimationFrame(step);
}

function buildCharts(items) {
  Chart.defaults.color       = '#7c8799';
  Chart.defaults.borderColor = 'rgba(255,255,255,.05)';
  const tt = {
    backgroundColor:'#10131a', borderColor:'rgba(230,57,70,.25)',
    borderWidth:1, padding:12,
    titleFont:{ family:'JetBrains Mono', size:11 },
    bodyFont: { family:'Syne', size:12 },
  };

  /* 1 — TOP 15 SCORE (datos reales) */
  const top15 = [...items].sort((a,b)=>(b.score??0)-(a.score??0)).slice(0,15);
  S.charts.score = new Chart($('cScore'), {
    type:'bar',
    data:{
      labels: top15.map(a => cut(a.title, 22)),
      datasets:[{ label:'Score', data: top15.map(a=>a.score??0),
        backgroundColor: top15.map((_,i) => i===0?'rgba(247,201,72,.9)':i===1?'rgba(247,201,72,.72)':i===2?'rgba(247,201,72,.55)':'rgba(230,57,70,.6)'),
        borderColor:     top15.map((_,i) => i<3?'rgba(247,201,72,.95)':'rgba(230,57,70,.9)'),
        borderWidth:1, borderRadius:5 }]
    },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:tt },
      scales:{ x:{ticks:{font:{size:9},maxRotation:45},grid:{display:false}},
               y:{min:8.5,ticks:{font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}} } }
  });

  /* 2 — TIPO */
  const typeCnt = {};
  items.forEach(a => { const t=a.type||'Unknown'; typeCnt[t]=(typeCnt[t]||0)+1; });
  S.charts.type = new Chart($('cType'), {
    type:'doughnut',
    data:{
      labels: Object.keys(typeCnt),
      datasets:[{ data: Object.values(typeCnt),
        backgroundColor:['#e63946','#f4a261','#43e97b','#4cc9f0','#f7c948','#a855f7'],
        borderColor:'#0c0e14', borderWidth:3 }]
    },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'62%',
      plugins:{ legend:{position:'bottom',labels:{font:{family:'JetBrains Mono',size:9},padding:10,boxWidth:10}}, tooltip:tt } }
  });

  /* 3 — EPISODIOS (solo series con dato real) */
  const withEps = items.filter(a=>a.episodes>0&&a.episodes<5000).sort((a,b)=>b.episodes-a.episodes).slice(0,10);
  S.charts.eps = new Chart($('cEps'), {
    type:'bar',
    data:{
      labels: withEps.map(a=>cut(a.title,24)),
      datasets:[{ label:'Episodios', data: withEps.map(a=>a.episodes),
        backgroundColor:'rgba(244,162,97,.65)', borderColor:'rgba(244,162,97,.9)',
        borderWidth:1, borderRadius:5 }]
    },
    options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y',
      plugins:{ legend:{display:false}, tooltip:tt },
      scales:{ x:{ticks:{font:{size:9}},grid:{color:'rgba(255,255,255,.04)'}},
               y:{ticks:{font:{size:9}},grid:{display:false}} } }
  });

  /* 4 — MIEMBROS */
  const top10m = [...items].filter(a=>a.members>0).sort((a,b)=>b.members-a.members).slice(0,10);
  S.charts.mem = new Chart($('cMem'), {
    type:'bar',
    data:{
      labels: top10m.map(a=>cut(a.title,22)),
      datasets:[{ label:'Miembros', data: top10m.map(a=>a.members),
        backgroundColor:'rgba(76,201,240,.65)', borderColor:'rgba(76,201,240,.9)',
        borderWidth:1, borderRadius:5 }]
    },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false},
        tooltip:{ ...tt, callbacks:{ label: ctx=>`${big(ctx.raw)} miembros` } } },
      scales:{ x:{ticks:{font:{size:9},maxRotation:40},grid:{display:false}},
               y:{ticks:{font:{size:9},callback:v=>big(v)},grid:{color:'rgba(255,255,255,.04)'}} } }
  });

  /* 5 — FAVORITOS */
  const top10f = [...items].filter(a=>a.favorites>0).sort((a,b)=>b.favorites-a.favorites).slice(0,10);
  S.charts.fav = new Chart($('cFav'), {
    type:'doughnut',
    data:{
      labels: top10f.map(a=>cut(a.title,18)),
      datasets:[{ data: top10f.map(a=>a.favorites),
        backgroundColor:['#e63946','#f4a261','#43e97b','#4cc9f0','#f7c948','#a855f7','#06d6a0','#ef476f','#118ab2','#ffd166'],
        borderColor:'#0c0e14', borderWidth:2 }]
    },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'55%',
      plugins:{
        legend:{position:'bottom',labels:{font:{family:'JetBrains Mono',size:8},padding:8,boxWidth:8}},
        tooltip:{ ...tt, callbacks:{ label: ctx=>`${big(ctx.raw)} favoritos` } } } }
  });

  /* 6 — SCORE POR AÑO (solo animes con year real del campo year de MAL) */
  const byYear = {};
  items.forEach(a => {
    const y = a.year; // solo campo year, no estimar
    if (y && a.score > 0) {
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(a.score);
    }
  });
  const years  = Object.keys(byYear).sort();
  const avgs   = years.map(y => {
    const arr = byYear[y];
    return +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2);
  });
  S.charts.year = new Chart($('cYear'), {
    type:'line',
    data:{
      labels: years,
      datasets:[{ label:'Score promedio', data: avgs,
        borderColor:'#e63946', backgroundColor:'rgba(230,57,70,.1)',
        pointBackgroundColor:'#e63946', pointRadius:5, pointHoverRadius:7,
        fill:true, tension:0.35 }]
    },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:tt },
      scales:{ x:{ticks:{font:{size:9}},grid:{color:'rgba(255,255,255,.04)'}},
               y:{min:7.5,max:10,ticks:{font:{size:9}},grid:{color:'rgba(255,255,255,.04)'}} } }
  });
}

/* ── MODAL ────────────────────────────────────── */
async function openModal(id) {
  D.minner.innerHTML = `<div style="padding:5rem;text-align:center">
    <div style="width:42px;height:42px;border:3px solid #3d4554;border-top-color:#e63946;
    border-radius:50%;animation:sp .75s linear infinite;margin:auto"></div></div>`;
  D.mov.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    // Carga en paralelo: datos completos + personajes + staff
    const [main, charsR, staffR] = await Promise.all([
      api(`/anime/${id}/full`),
      api(`/anime/${id}/characters`),
      api(`/anime/${id}/staff`),
    ]);
    const a     = main.data;
    const chars = (charsR.data ?? []).slice(0, 16);
    const staff = (staffR.data ?? []).slice(0, 12);
    if (!a) throw new Error('Sin datos');
    renderModal(a, chars, staff);
  } catch(e) {
    D.minner.innerHTML = `<div class="err" style="padding:4rem"><strong>Error</strong>${esc(e.message)}</div>`;
    toast('Error al cargar el anime.', 'error');
  }
}

function renderModal(a, chars, staff) {
  const faved   = isFav(a.mal_id);
  const img     = a.images?.jpg?.large_image_url ?? a.images?.jpg?.image_url ?? '';
  const score   = a.score   ? a.score.toFixed(2) : 'N/A';
  const status  = a.status  ?? '—';
  const air     = status.includes('Airing');
  const year    = a.year    ?? '—';
  const aired   = a.aired?.string ?? '—';
  const studios = (a.studios    ?? []).map(s=>s.name).join(', ') || '—';
  const prods   = (a.producers  ?? []).map(s=>s.name).join(', ') || '—';
  const lic     = (a.licensors  ?? []).map(s=>s.name).join(', ') || '—';
  const synopsis= a.synopsis ?? 'Sin sinopsis disponible.';

  /* GÉNEROS / TEMAS / DEMOGRAFÍA */
  const genres  = (a.genres       ?? []).map(g=>`<span class="gtag">${esc(g.name)}</span>`).join('');
  const themes  = (a.themes       ?? []).map(g=>`<span class="gtag theme">${esc(g.name)}</span>`).join('');
  const demos   = (a.demographics ?? []).map(g=>`<span class="gtag demo">${esc(g.name)}</span>`).join('');

  /* PERSONAJES */
  const charsHTML = chars.length
    ? chars.map(c => {
        const ci = c.character?.images?.jpg?.image_url ?? '';
        const va = (c.voice_actors??[]).find(v=>v.language==='Japanese')?.person?.name ?? '';
        return `<div class="mchar">
          ${ci?`<img src="${esc(ci)}" alt="${esc(c.character?.name)}" loading="lazy"/>`:''}
          <div class="mchar-b">
            <div class="mchar-n">${esc(c.character?.name)}</div>
            <div class="mchar-r">${esc(c.role)}</div>
            ${va?`<div class="mchar-va">🎙 ${esc(va)}</div>`:''}
          </div>
        </div>`;
      }).join('')
    : `<p class="err">Sin personajes disponibles.</p>`;

  /* STAFF */
  const staffHTML = staff.length
    ? staff.map(s => {
        const si  = s.person?.images?.jpg?.image_url ?? '';
        const pos = (s.positions??[]).join(', ');
        return `<div class="mpers">
          ${si?`<img src="${esc(si)}" alt="${esc(s.person?.name)}" loading="lazy"/>`:'<div style="width:42px;height:42px;border-radius:50%;background:var(--bgc);flex-shrink:0"></div>'}
          <div><div class="mpers-n">${esc(s.person?.name)}</div><div class="mpers-r">${esc(pos)}</div></div>
        </div>`;
      }).join('')
    : `<p class="err">Sin datos de staff.</p>`;

  /* TRAILER — campo real: trailer.youtube_id */
  const ytId = a.trailer?.youtube_id;
  const trailerHTML = ytId
    ? `<div class="mtrailer"><iframe
          src="https://www.youtube.com/embed/${esc(ytId)}"
          title="Trailer ${esc(a.title)}"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen loading="lazy">
       </iframe></div>`
    : `<div class="mno">⚠ Sin trailer disponible en MAL para este anime.</div>`;

  /* MÚSICA — campos reales: theme.openings, theme.endings */
  const ops = a.theme?.openings ?? [];
  const eds = a.theme?.endings  ?? [];
  const musicHTML = (ops.length || eds.length)
    ? `<div class="msongs">
        ${ops.length ? `<div class="mgrp-title">Opening${ops.length>1?'s':''}</div>${ops.map(t=>`<div class="msong">${esc(t)}</div>`).join('')}` : ''}
        ${eds.length ? `<div class="mgrp-title">Ending${eds.length>1?'s':''}</div>${eds.map(t=>`<div class="msong">${esc(t)}</div>`).join('')}` : ''}
      </div>`
    : `<div class="mno">⚠ Sin información de temas musicales en MAL para este anime.</div>`;

  /* RELACIONADOS — campo real: relations[].entry (type anime) */
  const rels = (a.relations ?? []).flatMap(r =>
    (r.entry ?? []).filter(e => e.type === 'anime').map(e => ({ rel: r.relation, ...e }))
  );
  const relHTML = rels.length
    ? `<div class="mrelated">${rels.map(e=>
        `<div class="mrel" data-id="${e.mal_id}">
          <div class="mrel-rel">${esc(e.rel)}</div>
          <div class="mrel-name">${esc(e.name)}</div>
          <div class="mrel-type">Anime — click para ver</div>
        </div>`
      ).join('')}</div>`
    : `<div class="mno">⚠ Sin relacionados disponibles.</div>`;

  /* STREAMING — campo real: streaming[] */
  const stream = a.streaming ?? [];
  /* LINKS EXTERNOS — campo real: external[] */
  const ext = a.external ?? [];

  /* ─── RENDER ─────────────────────────────────── */
  D.minner.innerHTML = `
    <div class="mbanner">
      <img src="${esc(img)}" alt=""/>
      <div class="mbannergrad"></div>
    </div>

    <div class="mhero">
      <div class="mposter"><img src="${esc(img)}" alt="${esc(a.title)}"/></div>
      <div class="minfo">
        <span class="mbadge">${esc(a.type??'ANIME')}</span>
        <h2 class="mtitle">${esc(a.title)}</h2>
        ${a.title_japanese ? `<p class="mtitlejp">${esc(a.title_japanese)}</p>` : ''}

        <div class="mscores">
          <div>
            <div class="mscorebig">★ ${score}</div>
            <div class="mscorelbl">Score MAL</div>
          </div>
          ${a.rank      ? `<span class="mpill"><strong>#${a.rank}</strong> Rank</span>` : ''}
          ${a.popularity? `<span class="mpill"><strong>#${a.popularity}</strong> Popular.</span>` : ''}
          ${a.members   ? `<span class="mpill"><strong>${big(a.members)}</strong> miembros</span>` : ''}
          ${a.favorites ? `<span class="mpill"><strong>${big(a.favorites)}</strong> favoritos</span>` : ''}
          ${a.episodes  ? `<span class="mpill"><strong>${a.episodes}</strong> eps</span>` : ''}
          <span class="mpill ${air?'air':''}"><strong>${air?'🟢 En emisión':esc(status)}</strong></span>
        </div>

        ${(genres||themes||demos)?`<div class="mgenres">${genres}${themes}${demos}</div>`:''}

        <div class="mbtns">
          <button class="mbtnp ${faved?'faved':''}" id="mfavbtn">${faved?'★ En Favoritos':'☆ Añadir Favorito'}</button>
          ${a.url   ? `<a href="${esc(a.url)}" target="_blank" rel="noopener"><button class="mbtnp sec">Ver en MAL ↗</button></a>` : ''}
          ${stream[0]?.url ? `<a href="${esc(stream[0].url)}" target="_blank" rel="noopener"><button class="mbtnp sec">Ver online ↗</button></a>` : ''}
        </div>
      </div>
    </div>

    <!-- TABS -->
    <div class="mtabs">
      <button class="mtab on" data-tab="syn">Sinopsis</button>
      <button class="mtab" data-tab="info">Información</button>
      <button class="mtab" data-tab="chars">Personajes</button>
      <button class="mtab" data-tab="staff">Staff</button>
      <button class="mtab" data-tab="trailer">Trailer</button>
      <button class="mtab" data-tab="music">Música</button>
      <button class="mtab" data-tab="rel">Relacionados</button>
    </div>

    <!-- Sinopsis -->
    <div class="mtp on" data-tp="syn">
      <p class="msynopsis">${esc(synopsis)}</p>
      ${a.background && a.background !== synopsis
        ? `<hr class="mdiv"><p class="mgrp-title">Trasfondo</p><p class="msynopsis">${esc(a.background)}</p>`
        : ''}
    </div>

    <!-- Info — solo campos que sí devuelve la API -->
    <div class="mtp" data-tp="info">
      <div class="mingrid">
        <div class="mig-item"><div class="mig-title">Tipo</div><div class="mig-val">${esc(a.type??'—')}</div></div>
        <div class="mig-item"><div class="mig-title">Episodios</div><div class="mig-val">${a.episodes??'?'}</div></div>
        <div class="mig-item"><div class="mig-title">Estado</div><div class="mig-val">${esc(status)}</div></div>
        <div class="mig-item"><div class="mig-title">Emisión</div><div class="mig-val">${esc(aired)}</div></div>
        <div class="mig-item"><div class="mig-title">Año</div><div class="mig-val">${year}</div></div>
        <div class="mig-item"><div class="mig-title">Temporada</div><div class="mig-val">${esc(a.season??'—')} ${a.year??''}</div></div>
        <div class="mig-item"><div class="mig-title">Duración ep.</div><div class="mig-val">${esc(a.duration??'—')}</div></div>
        <div class="mig-item"><div class="mig-title">Clasificación</div><div class="mig-val">${esc(a.rating??'—')}</div></div>
        <div class="mig-item"><div class="mig-title">Fuente</div><div class="mig-val">${esc(a.source??'—')}</div></div>
        <div class="mig-item"><div class="mig-title">Votos (score)</div><div class="mig-val">${a.scored_by?big(a.scored_by)+' votos':'—'}</div></div>
        <div class="mig-item span2"><div class="mig-title">Estudio</div><div class="mig-val">${esc(studios)}</div></div>
        <div class="mig-item span2"><div class="mig-title">Productoras</div><div class="mig-val">${esc(prods)}</div></div>
        <div class="mig-item span2"><div class="mig-title">Licenciatarios</div><div class="mig-val">${esc(lic)}</div></div>
        ${stream.length?`<div class="mig-item span2"><div class="mig-title">Streaming</div>
          <div class="links-row">${stream.map(s=>`<a class="lnk" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>`).join('')}</div></div>`:''}
        ${ext.length?`<div class="mig-item span2"><div class="mig-title">Links externos</div>
          <div class="links-row">${ext.map(s=>`<a class="lnk ext" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>`).join('')}</div></div>`:''}
      </div>
    </div>

    <!-- Personajes -->
    <div class="mtp" data-tp="chars"><div class="mchars">${charsHTML}</div></div>

    <!-- Staff -->
    <div class="mtp" data-tp="staff"><div class="mstaff">${staffHTML}</div></div>

    <!-- Trailer -->
    <div class="mtp" data-tp="trailer">${trailerHTML}</div>

    <!-- Música -->
    <div class="mtp" data-tp="music">${musicHTML}</div>

    <!-- Relacionados -->
    <div class="mtp" data-tp="rel">${relHTML}</div>
  `;

  /* Tabs */
  D.minner.querySelectorAll('.mtab').forEach(tab => {
    tab.addEventListener('click', () => {
      D.minner.querySelectorAll('.mtab').forEach(t=>t.classList.remove('on'));
      D.minner.querySelectorAll('.mtp').forEach(t=>t.classList.remove('on'));
      tab.classList.add('on');
      D.minner.querySelector(`[data-tp="${tab.dataset.tab}"]`)?.classList.add('on');
    });
  });

  /* Favorito */
  const fb = $('mfavbtn');
  fb?.addEventListener('click', () => {
    toggleFav(a);
    const now = isFav(a.mal_id);
    fb.classList.toggle('faved', now);
    fb.textContent = now ? '★ En Favoritos' : '☆ Añadir Favorito';
    document.querySelectorAll(`.card[data-id="${a.mal_id}"]`).forEach(c=>refreshFavBtn(c, a.mal_id));
  });

  /* Clic en relacionados → abrir ese anime */
  D.minner.querySelectorAll('.mrel[data-id]').forEach(r => {
    r.addEventListener('click', () => openModal(r.dataset.id));
  });
}

/* Cerrar modal */
D.mclose.addEventListener('click', closeModal);
D.mov.addEventListener('click', e => { if (e.target === D.mov) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
function closeModal() {
  D.mov.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { D.minner.innerHTML = ''; }, 360);
}

/* ── FAVORITOS ────────────────────────────────── */
function loadFavs() {
  try { return JSON.parse(localStorage.getItem('animex_favs')||'[]'); }
  catch { return []; }
}
function saveFavs() { localStorage.setItem('animex_favs', JSON.stringify(S.favs)); updFC(); }
function isFav(id)  { return S.favs.some(f => f.mal_id === id); }
function updFC() {
  const n = S.favs.length;
  D.fc.textContent = n;
  D.fc.style.display = n ? 'inline-flex' : 'none';
}
function toggleFav(a) {
  if (isFav(a.mal_id)) {
    S.favs = S.favs.filter(f=>f.mal_id!==a.mal_id);
    toast(`"${cut(a.title,28)}" eliminado`, 'unfav');
  } else {
    S.favs.push({ mal_id:a.mal_id, title:a.title, score:a.score,
      type:a.type, episodes:a.episodes, images:a.images, status:a.status, airing:a.airing });
    toast(`"${cut(a.title,28)}" añadido ❤️`, 'fav');
  }
  saveFavs();
  if (S.sec === 'favs') renderFavs();
}
function renderFavs() {
  D.favgrid.innerHTML = '';
  if (!S.favs.length) {
    D.fempty.style.display = 'block';
    D.favgrid.style.display = 'none'; return;
  }
  D.fempty.style.display  = 'none';
  D.favgrid.style.display = 'grid';
  const f = document.createDocumentFragment();
  S.favs.forEach((a,i) => f.appendChild(card(a, null, i*0.04)));
  D.favgrid.appendChild(f);
}
D.clrFavs.addEventListener('click', () => {
  if (!S.favs.length) return;
  if (confirm('¿Eliminar todos los favoritos?')) {
    S.favs=[]; saveFavs(); renderFavs(); toast('Favoritos eliminados','info');
  }
});

/* ── SCROLL HEADER ────────────────────────────── */
window.addEventListener('scroll', () => {
  D.hdr.style.background = scrollY>30 ? 'rgba(7,8,12,.98)' : 'rgba(7,8,12,.92)';
}, { passive:true });

const up = () => window.scrollTo({ top:0, behavior:'smooth' });

/* ── INIT ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updFC();
  setTimeout(() => D.si?.focus(), 350);
  console.log('%cANIMEX 🎌', 'font-size:22px;color:#e63946;font-weight:bold;letter-spacing:4px');
});
