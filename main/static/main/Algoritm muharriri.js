/* ==========================================================
   Algoritm muharriri

   Elementlar tuzilmasi HTML dagi <template> larda turadi:
     tpl-node-{start|io|calc|cond|end}  - bloklar
     tpl-edge                           - bog'lanish
     tpl-link, tpl-variable,
     tpl-run-input, tpl-test-result     - ro'yxat elementlari
   Palitra (#pal) ham HTML da. Bu fayl faqat ularni
   klonlaydi, matn/koordinata yozadi va hodisalarni ulaydi.
   ========================================================== */

/* ---------- Blok turlari (o'lcham va standart matn) ---------- */
// Diqqat: w/h HTML dagi <template> o'lchamlari bilan bir xil bo'lishi kerak.
const T = {
  start: { name: 'Boshlash',             w: 140, h: 50 },
  io:    { name: 'Kiritish / Chiqarish', w: 160, h: 56, text: 'Kiritish: a, b' },
  calc:  { name: 'Hisoblash',            w: 150, h: 56, text: 's = a + b' },
  cond:  { name: 'Shart',                w: 160, h: 90, text: 'a > b ?' },
  end:   { name: 'Tugash',               w: 140, h: 50 }
};
const GRID = 20;

/* ---------- Doimiy elementlar ---------- */
const $ = id => document.getElementById(id);
const ws = $('ws'), gN = $('gN'), gE = $('gE'), tmp = $('tmp'), edit = $('edit'), viewport = $('viewport');

/* ---------- Holat ---------- */
let nodes = [], edges = [], sel = null, uid = 1;
let conn = null, drag = null, pan = null;
let zoom = 1, panX = 0, panY = 0;
let droppingVariable = false;
let lastSubmitted = null;

/* ---------- Yordamchilar ---------- */
const snap = v => Math.round(v / GRID) * GRID;
const nodeById = id => nodes.find(n => n.id === id);

// <template id="..."> dan nusxa oladi
const cloneTemplate = id => document.importNode($(id).content, true);
// Nusxa ichidan [data-slot="..."] elementini topadi
const slot = (root, name) => root.querySelector(`[data-slot="${name}"]`);
// Nusxa ichidan [data-ref="..."] elementini topadi
const ref = (root, name) => root.querySelector(`[data-ref="${name}"]`);

// Ekran koordinatasi -> ishchi maydon koordinatasi (zoom va pan hisobga olingan)
function pointerPoint(x, y) {
  const r = ws.getBoundingClientRect();
  return { x: (x - r.left - panX) / zoom, y: (y - r.top - panY) / zoom };
}

/* ==========================================================
   ZOOM va PAN
   ========================================================== */
function updateViewport() {
  viewport.setAttribute('transform', `translate(${panX} ${panY}) scale(${zoom})`);
  $('zoom-level').textContent = `${Math.round(zoom * 100)}%`;
}

function zoomAt(next, x, y) {
  const scale = Math.max(0.25, Math.min(3, next)), r = ws.getBoundingClientRect();
  const px = x - r.left, py = y - r.top;
  const worldX = (px - panX) / zoom, worldY = (py - panY) / zoom;
  zoom = scale;
  panX = px - worldX * zoom;
  panY = py - worldY * zoom;
  updateViewport();
}

function zoomCenter(next) {
  const r = ws.getBoundingClientRect();
  zoomAt(next, r.left + r.width / 2, r.top + r.height / 2);
}

$('zoom-in').onclick = () => zoomCenter(zoom * 1.2);
$('zoom-out').onclick = () => zoomCenter(zoom / 1.2);
$('zoom-reset').onclick = () => { zoom = 1; panX = 0; panY = 0; updateViewport(); };
ws.addEventListener('wheel', e => {
  e.preventDefault();
  zoomAt(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY);
}, { passive: false });
updateViewport();

/* ==========================================================
   PALITRA (HTML da tayyor, bu yerda faqat hodisalar)
   ========================================================== */
document.querySelectorAll('#pal .pal').forEach(item => {
  const type = item.dataset.t;
  if (!T[type]) return;
  item.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', type));
  item.addEventListener('click', () => {
    const offset = 60 + nodes.length % 5 * 30;
    addNode(type, offset, offset);
  });
});

ws.addEventListener('dragover', e => e.preventDefault());
ws.addEventListener('drop', e => {
  e.preventDefault();
  const type = e.dataTransfer.getData('text/plain');
  if (!T[type]) return;
  const p = pointerPoint(e.clientX, e.clientY);
  addNode(type, p.x - T[type].w / 2, p.y - T[type].h / 2);
});

/* ==========================================================
   BLOK QO'SHISH va GEOMETRIYA
   ========================================================== */
function addNode(type, x, y, text) {
  const n = {
    id: uid++, type,
    x: Math.max(0, snap(x)), y: Math.max(0, snap(y)),
    w: T[type].w, h: T[type].h,
    text: text || T[type].text || T[type].name
  };
  nodes.push(n);
  sel = { k: 'n', id: n.id };
  render();
  return n;
}

// Blokning 4 tomonidagi ulanish nuqtalari: [x, y, yo'nalish dx, dy]
const sides = n => ({
  t: [n.x + n.w / 2, n.y, 0, -1],
  r: [n.x + n.w, n.y + n.h / 2, 1, 0],
  b: [n.x + n.w / 2, n.y + n.h, 0, 1],
  l: [n.x, n.y + n.h / 2, -1, 0]
});

// Bezier egri chiziq: d - path, m - o'rta nuqta (yorliq uchun)
function bez(a, b) {
  const k = Math.max(40, Math.hypot(a[0] - b[0], a[1] - b[1]) / 3);
  const c1 = [a[0] + a[2] * k, a[1] + a[3] * k];
  const c2 = [b[0] + b[2] * k, b[1] + b[3] * k];
  return {
    d: `M${a[0]} ${a[1]} C${c1} ${c2} ${b[0]} ${b[1]}`,
    m: [(a[0] + 3 * c1[0] + 3 * c2[0] + b[0]) / 8, (a[1] + 3 * c1[1] + 3 * c2[1] + b[1]) / 8]
  };
}

/* ==========================================================
   RENDER
   ========================================================== */
function renderEdges() {
  gE.innerHTML = '';
  edges.forEach(e => {
    const a = nodeById(e.from), b = nodeById(e.to);
    if (!a || !b) return;
    const path = bez(sides(a)[e.fs], sides(b)[e.ts]);

    const frag = cloneTemplate('tpl-edge');
    const group = ref(frag, 'edge-group');
    const line = ref(frag, 'edge-line');
    const hit = ref(frag, 'edge-hit');
    const label = ref(frag, 'edge-label');

    line.setAttribute('d', path.d);
    hit.setAttribute('d', path.d);
    if (sel && sel.k === 'e' && sel.id === e.id) line.classList.add('sel');

    hit.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      sel = { k: 'e', id: e.id };
      render();
    });

    if (a.type === 'cond') {
      label.setAttribute('x', path.m[0]);
      label.setAttribute('y', path.m[1] - 6);
      label.textContent = e.label;
      label.addEventListener('pointerdown', ev => {
        ev.stopPropagation();
        e.label = e.label === 'Ha' ? 'Yo‘q' : 'Ha';
        render();
      });
    } else {
      label.remove();
    }

    gE.appendChild(group);
  });
}

function renderNodes() {
  gN.innerHTML = '';
  nodes.forEach(n => {
    const frag = cloneTemplate(`tpl-node-${n.type}`);
    const g = ref(frag, 'node');

    g.setAttribute('transform', `translate(${n.x},${n.y})`);
    g.setAttribute('data-id', n.id);
    if (sel && sel.k === 'n' && sel.id === n.id) g.classList.add('sel');
    slot(g, 'text').textContent = n.text;

    // Portlar: bosib tortsa bog'lanish boshlanadi
    g.querySelectorAll('.port').forEach(port => {
      port.addEventListener('pointerdown', ev => {
        ev.stopPropagation();
        ev.preventDefault();
        conn = { from: n.id, fs: port.dataset.side };
        document.body.classList.add('c');
        gN.classList.add('show');
      });
    });

    // Blokni tanlash va sudrashni boshlash
    g.addEventListener('pointerdown', ev => {
      if (ev.target.classList.contains('port')) return;
      sel = { k: 'n', id: n.id };
      gN.querySelectorAll('.node.sel').forEach(node => node.classList.remove('sel'));
      gE.querySelectorAll('.edge.sel').forEach(edge => edge.classList.remove('sel'));
      g.classList.add('sel');
      const p = pointerPoint(ev.clientX, ev.clientY);
      drag = { n, dx: p.x - n.x, dy: p.y - n.y };
    });

    g.addEventListener('dblclick', () => openEdit(n));
    gN.appendChild(g);
  });
}

function renderLinks() {
  const list = $('links');
  list.innerHTML = '';
  edges.forEach(e => {
    const a = nodeById(e.from), b = nodeById(e.to);
    if (!a || !b) return;
    const frag = cloneTemplate('tpl-link');
    slot(frag, 'text').textContent = `${a.text} → ${b.text}` + (a.type === 'cond' ? ` (${e.label})` : '');
    list.appendChild(frag);
  });
}

function renderVariables() {
  const box = $('variables');
  box.innerHTML = '';
  AlgorithmEngine.getVariables(nodes).forEach(name => {
    const frag = cloneTemplate('tpl-variable');
    const chip = slot(frag, 'name');
    chip.textContent = name;

    chip.addEventListener('pointerdown', () => { droppingVariable = true; });
    chip.addEventListener('dragstart', ev => {
      ev.dataTransfer.setData('text/plain', name);
      droppingVariable = true;
    });
    chip.addEventListener('dragend', () => { droppingVariable = false; });
    chip.addEventListener('click', () => insertVariable(name));

    box.appendChild(frag);
  });
}

// Chipni bosganda: tanlangan (yoki oxirgi) "Hisoblash" blokiga nomni yozadi
function insertVariable(name) {
  const selected = sel && sel.k === 'n' ? nodeById(sel.id) : null;
  const calc = selected && selected.type === 'calc'
    ? selected
    : [...nodes].reverse().find(n => n.type === 'calc');
  if (!calc) return;

  if (edit.style.display === 'block') {
    edit.setRangeText(name, edit.selectionStart, edit.selectionEnd, 'end');
  } else {
    openEdit(calc);
    edit.setRangeText(name, edit.value.length, edit.value.length, 'end');
  }
  droppingVariable = false;
  edit.focus();
}

function render() {
  renderEdges();
  renderNodes();
  renderLinks();
  renderVariables();
}

/* ==========================================================
   SICHQONCHA: sudrash, ulash, pan
   ========================================================== */
window.addEventListener('pointermove', ev => {
  if (pan) {
    panX = pan.x + ev.clientX - pan.startX;
    panY = pan.y + ev.clientY - pan.startY;
    updateViewport();
  }
  const p = pointerPoint(ev.clientX, ev.clientY);
  if (drag) {
    drag.n.x = Math.max(0, snap(p.x - drag.dx));
    drag.n.y = Math.max(0, snap(p.y - drag.dy));
    render();
  }
  if (conn) {
    const a = sides(nodeById(conn.from))[conn.fs];
    tmp.style.display = 'block';
    tmp.setAttribute('d', bez(a, [p.x, p.y, -a[2], -a[3]]).d);
  }
});

window.addEventListener('pointerup', ev => {
  pan = null;
  $('main').classList.remove('panning');
  drag = null;
  if (!conn) return;

  tmp.style.display = 'none';
  gN.classList.remove('show');
  document.body.classList.remove('c');

  const hit = document.elementFromPoint(ev.clientX, ev.clientY);
  const g = hit && hit.closest && hit.closest('.node');
  if (g) {
    const to = +g.dataset.id;
    if (to !== conn.from) {
      const target = nodeById(to);
      const p = pointerPoint(ev.clientX, ev.clientY);

      // Nishon blokning kursorga eng yaqin tomonini topish
      let best = 't', bestDist = Infinity;
      const s = sides(target);
      for (const k in s) {
        const d = Math.hypot(s[k][0] - p.x, s[k][1] - p.y);
        if (d < bestDist) { bestDist = d; best = k; }
      }

      const from = nodeById(conn.from);
      const outs = edges.filter(e => e.from === from.id).length;
      if (!edges.some(e => e.from === from.id && e.to === to)) {
        edges.push({ id: uid++, from: from.id, fs: conn.fs, to, ts: best, label: outs === 0 ? 'Ha' : 'Yo‘q' });
      }
    }
  }
  conn = null;
  render();
});

// Bo'sh joyni bossa: tanlovni olib tashlash va pan boshlash
$('bg').addEventListener('pointerdown', ev => {
  sel = null;
  render();
  pan = { startX: ev.clientX, startY: ev.clientY, x: panX, y: panY };
  $('main').classList.add('panning');
});

/* ==========================================================
   MATNNI TAHRIRLASH
   ========================================================== */
function openEdit(n) {
  edit.style.display = 'block';
  edit.value = n.text;
  edit.placeholder = n.type === 'calc'
    ? 'Masalan: s = a + b'
    : 'Masalan: Kiritish: a, b yoki Chiqarish: s';
  edit.style.left = (panX + n.x * zoom) + 'px';
  edit.style.top = (panY + (n.y + n.h / 2) * zoom - 16) + 'px';
  edit.style.width = (n.w * zoom) + 'px';
  edit.focus();
  edit.select();

  const done = () => {
    if (droppingVariable) return;
    n.text = edit.value || n.text;
    edit.style.display = 'none';
    edit.onblur = edit.onkeydown = null;
    render();
  };
  edit.onblur = done;
  edit.onkeydown = e => { if (e.key === 'Enter') done(); };
}

edit.addEventListener('dragover', e => e.preventDefault());
edit.addEventListener('drop', e => {
  e.preventDefault();
  const variable = e.dataTransfer.getData('text/plain');
  if (/^[A-Za-z_]\w*$/.test(variable)) {
    edit.setRangeText(variable, edit.selectionStart, edit.selectionEnd, 'end');
  }
  droppingVariable = false;
  edit.focus();
});

/* ==========================================================
   O'CHIRISH / TOZALASH
   ========================================================== */
function remove() {
  if (!sel) return;
  if (sel.k === 'n') {
    nodes = nodes.filter(n => n.id !== sel.id);
    edges = edges.filter(e => e.from !== sel.id && e.to !== sel.id);
  } else {
    edges = edges.filter(e => e.id !== sel.id);
  }
  sel = null;
  render();
}

window.addEventListener('keydown', e => {
  // Input/dialog ichida Backspace oddiy ishlashi kerak
  if (e.target instanceof Element && e.target.closest('input, textarea, dialog')) return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    remove();
  }
});

$('del').onclick = remove;
$('clear').onclick = () => { nodes = []; edges = []; sel = null; render(); };

/* ==========================================================
   ISHGA TUSHIRISH DIALOGI
   ========================================================== */
function resetRunDialog() {
  $('run-inputs').innerHTML = '';
  const result = $('run-result');
  result.textContent = '';
  result.classList.remove('error');
  $('run-submit').hidden = false;

  const summary = $('tests-summary');
  summary.textContent = '';
  summary.classList.remove('ok');
  $('test-results').innerHTML = '';
  $('submit-status').textContent = '';
}

$('run').onclick = () => {
  resetRunDialog();
  const box = $('run-inputs');
  AlgorithmEngine.getVariables(nodes).forEach(name => {
    const frag = cloneTemplate('tpl-run-input');
    slot(frag, 'name').textContent = name;
    slot(frag, 'field').dataset.variable = name;
    box.appendChild(frag);
  });
  $('run-dialog').showModal();
  box.querySelector('input')?.focus();
};

$('run-close').onclick = () => $('run-dialog').close();

$('run-submit').onclick = () => {
  const fields = [...$('run-inputs').querySelectorAll('input')];
  if (fields.some(field => !field.reportValidity())) return;
  const values = Object.fromEntries(fields.map(field => [field.dataset.variable, field.value]));
  const result = $('run-result');
  try {
    const outputs = AlgorithmEngine.run(nodes, edges, name => values[name]);
    result.textContent = outputs.length ? outputs.join('\n') : 'Algoritm muvaffaqiyatli bajarildi.';
    result.classList.remove('error');
    $('run-submit').hidden = true;
  } catch (error) {
    result.textContent = `Xatolik: ${error.message}`;
    result.classList.add('error');
  }
};

/* ==========================================================
   BAZADAGI TESTLAR BILAN TEKSHIRISH
   Testlar Django `json_script:"algorithm-tests"` orqali keladi:
   [{"order": 1, "input": "5\n3", "expected": "8"}]
   ========================================================== */
function readAlgorithmTests() {
  const source = $('algorithm-tests');
  if (!source) return [];
  try {
    const data = JSON.parse(source.textContent || '[]');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function runAlgorithmTests() {
  const tests = readAlgorithmTests();
  const summary = $('tests-summary'), list = $('test-results');
  summary.textContent = '';
  summary.classList.remove('ok');
  list.innerHTML = '';
  $('submit-status').textContent = '';
  $('run-result').textContent = '';
  $('run-result').classList.remove('error');

  if (!tests.length) {
    summary.textContent = 'Bu topshiriq uchun testlar kiritilmagan.';
    return;
  }

  const results = AlgorithmEngine.judge(nodes, edges, tests);
  let passed = 0;

  results.forEach(r => {
    let detail;
    if (r.error) detail = `xatolik: ${r.error}`;
    else if (r.ok) detail = `natija: ${r.actual.join(', ') || '—'}`;
    else detail = `kutilgan: ${r.expected.join(', ') || '—'}; olindi: ${r.actual.join(', ') || '—'}`;

    if (r.ok) passed += 1;

    const frag = cloneTemplate('tpl-test-result');
    const item = slot(frag, 'text');
    item.className = r.ok ? 'test-ok' : 'test-fail';
    item.textContent = `Test ${r.order}: ${r.ok ? 'o‘tdi — ' : 'o‘tmadi — '}${detail}`;
    list.appendChild(frag);
  });

  summary.textContent = `${passed} / ${tests.length} test o‘tdi`;
  summary.classList.toggle('ok', passed === tests.length);

  if (passed === tests.length) submitResult(passed, tests.length);
}

$('run-tests').onclick = runAlgorithmTests;

/* ==========================================================
   NATIJANI SERVERGA YUBORISH (AJAX)
   .app elementida data-submit-url va data-csrf bo'lsa ishlaydi.
   ========================================================== */
function serializeDiagram() {
  return {
    nodes: nodes.map(({ id, type, x, y, text }) => ({ id, type, x, y, text })),
    edges: edges.map(({ from, to, fs, ts, label }) => ({ from, to, fs, ts, label }))
  };
}

async function submitResult(passed, total) {
  const app = document.querySelector('.app');
  const url = app && app.dataset.submitUrl;
  const status = $('submit-status');
  if (!url) return;

  const diagram = serializeDiagram();
  const fingerprint = JSON.stringify(diagram);
  if (fingerprint === lastSubmitted) return; // bir xil diagramma qayta yuborilmaydi

  status.textContent = 'Natija yuborilmoqda…';
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': app.dataset.csrf || '',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ passed, total, diagram })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Server xatosi');
    lastSubmitted = fingerprint;
    status.textContent = data.score !== undefined
      ? `Natija saqlandi. Ball: ${data.score}`
      : 'Natija saqlandi.';
  } catch (err) {
    status.textContent = `Yuborib bo‘lmadi: ${err.message}`;
  }
}

/* ==========================================================
   NAMUNA va BOSHLANG'ICH SXEMA
   ========================================================== */
function link(a, fs, b, ts, label) {
  edges.push({ id: uid++, from: a.id, fs, to: b.id, ts, label: label || 'Ha' });
}

$('demo').onclick = () => {
  nodes = [];
  edges = [];
  sel = null;
  const s = addNode('start', 240, 20, 'Boshlash');
  const i = addNode('io', 230, 120, 'Kiritish: a, b');
  const c = addNode('cond', 240, 220, 'a > b ?');
  const y = addNode('calc', 60, 360, 'm = a');
  const n = addNode('calc', 420, 360, 'm = b');
  const o = addNode('io', 240, 480, 'Chiqarish: m');
  const e = addNode('end', 240, 580, 'Tugash');
  link(s, 'b', i, 't');
  link(i, 'b', c, 't');
  link(c, 'l', y, 't', 'Ha');
  link(c, 'r', n, 't', 'Yo‘q');
  link(y, 'b', o, 'l');
  link(n, 'b', o, 'r');
  link(o, 'b', e, 't');
  sel = null;
  render();
};

/* Django `json_script:"algorithm-initial"` orqali kelishi mumkin:
   {
     "nodes": [{"id": 1, "type": "start", "x": 240, "y": 20, "text": "Boshlash"}],
     "edges": [{"from": 1, "to": 2, "fs": "b", "ts": "t", "label": "Ha"}]
   }
   Bo'sh bo'lsa, standart namuna ochiladi. */
function loadInitialDiagram() {
  const source = $('algorithm-initial');
  if (!source) return false;

  let data;
  try { data = JSON.parse(source.textContent || '{}'); } catch (error) { return false; }
  if (!data || !Array.isArray(data.nodes) || !data.nodes.length) return false;

  let maxId = 0;
  nodes = [];
  data.nodes.forEach(node => {
    const preset = T[node.type];
    if (!preset) return;
    const id = Number(node.id) || maxId + 1;
    maxId = Math.max(maxId, id);
    const x = typeof node.x === 'number' ? node.x : 0;
    const y = typeof node.y === 'number' ? node.y : 0;
    const text = typeof node.text === 'string' && node.text.trim() ? node.text : (preset.text || preset.name);
    nodes.push({ id, type: node.type, x: Math.max(0, snap(x)), y: Math.max(0, snap(y)), w: preset.w, h: preset.h, text });
  });
  if (!nodes.length) return false;

  const byId = new Map(nodes.map(node => [node.id, node]));
  edges = [];
  (Array.isArray(data.edges) ? data.edges : []).forEach(edge => {
    const from = byId.get(Number(edge.from)), to = byId.get(Number(edge.to));
    if (!from || !to) return;
    edges.push({ id: ++maxId, from: from.id, fs: edge.fs || 'b', to: to.id, ts: edge.ts || 't', label: edge.label || 'Ha' });
  });

  uid = maxId + 1;
  sel = null;
  render();
  return true;
}

if (!loadInitialDiagram()) $('demo').click();
