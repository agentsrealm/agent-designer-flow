/* js/canvas.js — pan, zoom, drag, drop, grid, minimap */
window.AF = window.AF || {};

var _canvasContainer, _canvas, _gridCanvas, _hint;
var _minimapCanvas, _minimapCtx;
var GRID = 20;

AF.initCanvas = function () {
  _canvasContainer = document.getElementById('canvas-container');
  _canvas          = document.getElementById('canvas');
  _gridCanvas      = document.getElementById('grid-canvas');
  _hint            = document.getElementById('canvas-hint');

  AF.initEdges();
  initGrid();
  bindDrop();
  bindPanZoom();
  bindNodeInteractions();
  bindKeyboard();
  initMinimap();

  AF.store.on('nodes',     syncNodes);
  AF.store.on('edges',     function () { AF.renderEdges(); });
  AF.store.on('selection', onSelectionChange);
  AF.store.on('zoom',      applyTransform);
  AF.store.on('pan',       applyTransform);
  AF.store.on('import',    function () { syncNodes(); AF.renderEdges(); applyTransform(); });

  applyTransform();
};

/* ── Grid ── */
function initGrid() {
  var ro = new ResizeObserver(function () { resizeGrid(); });
  ro.observe(_canvasContainer);
  resizeGrid();
  AF.store.on('zoom', paintGrid);
  AF.store.on('pan',  paintGrid);
}

function resizeGrid() {
  _gridCanvas.width  = _canvasContainer.offsetWidth;
  _gridCanvas.height = _canvasContainer.offsetHeight;
  paintGrid();
}

function paintGrid() {
  var ctx     = _gridCanvas.getContext('2d');
  var w       = _gridCanvas.width, h = _gridCanvas.height;
  var zoom    = AF.store.get('zoom');
  var panX    = AF.store.get('panX'), panY = AF.store.get('panY');
  var isLight = document.body.classList.contains('theme-light');

  // background
  ctx.fillStyle = isLight ? '#ffffff' : '#0f1117';
  ctx.fillRect(0, 0, w, h);

  var step    = GRID * zoom;          // pixels between dots
  var bigStep = step * 5;             // every 5th dot is larger (100px at zoom=1)

  // colour palette
  var dotColor = isLight ? 'rgba(160,170,200,0.8)' : 'rgba(55,68,105,0.95)';
  var dotR     = Math.max(0.8, zoom * 0.9);

  var startX = ((panX % step) + step) % step;
  var startY = ((panY % step) + step) % step;

  ctx.fillStyle = dotColor;
  for (var cx = startX; cx <= w; cx += step) {
    for (var cy = startY; cy <= h; cy += step) {
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, 6.2832);
      ctx.fill();
    }
  }
}

/* ── Transform ── */
function applyTransform() {
  var zoom = AF.store.get('zoom');
  var panX = AF.store.get('panX'), panY = AF.store.get('panY');
  _canvas.style.transform       = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
  _canvas.style.transformOrigin = '0 0';
  AF.renderEdges();
  paintMinimap();
}

/* ── Drop from palette ── */
function bindDrop() {
  _canvasContainer.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  _canvasContainer.addEventListener('drop', function (e) {
    e.preventDefault();
    var type = e.dataTransfer.getData('node-type');
    if (!type) return;
    var def = AF.getItemDef(type);
    if (!def) return;

    var rect = _canvasContainer.getBoundingClientRect();
    var zoom = AF.store.get('zoom');
    var panX = AF.store.get('panX'), panY = AF.store.get('panY');
    var x = snap((e.clientX - rect.left - panX) / zoom);
    var y = snap((e.clientY - rect.top  - panY) / zoom);

    var id = AF.store.nextId();
    AF.store.addNode({
      id: id, type: def.type, category: def.category,
      label: def.label, icon: def.icon, x: x, y: y,
      props: JSON.parse(JSON.stringify(def.defaultProps || {})),
    });
    AF.store.select(id, 'node');
    _hint.style.display = 'none';
  });
}

/* ── Pan & Zoom ── */
function bindPanZoom() {
  var isPanning = false, startX, startY, startPanX, startPanY;

  _canvasContainer.addEventListener('mousedown', function (e) {
    if (e.target !== _canvasContainer && e.target !== _canvas && e.target !== _gridCanvas) return;
    if (e.button !== 1 && !(e.button === 0 && e.altKey)) return;
    isPanning = true;
    startX = e.clientX; startY = e.clientY;
    startPanX = AF.store.get('panX'); startPanY = AF.store.get('panY');
    _canvasContainer.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    if (!isPanning) return;
    AF.store.setPan(startPanX + e.clientX - startX, startPanY + e.clientY - startY);
  });
  window.addEventListener('mouseup', function () {
    if (isPanning) { isPanning = false; _canvasContainer.style.cursor = ''; }
  });

  _canvasContainer.addEventListener('wheel', function (e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.08 : 0.93;
    var rect   = _canvasContainer.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    var oz = AF.store.get('zoom'), nz = Math.max(0.2, Math.min(3, oz * factor));
    AF.store.setPan(AF.store.get('panX') + mx - mx*(nz/oz), AF.store.get('panY') + my - my*(nz/oz));
    AF.store.setZoom(nz);
  }, { passive:false });

  _canvasContainer.addEventListener('mousedown', function (e) {
    if (e.target === _canvasContainer || e.target === _canvas || e.target === _gridCanvas) {
      AF.store.deselect();
    }
  });
}

/* ── Node interactions (drag, connect, click) ── */
function bindNodeInteractions() {
  var dragging = null, dragOffX, dragOffY, didMove;

  _canvas.addEventListener('mousedown', function (e) {
    var nodeEl = e.target.closest('.canvas-node');
    if (!nodeEl) return;

    var portEl = e.target.closest('.node-port');
    if (portEl) {
      var srcNode = AF.store.getNode(nodeEl.dataset.nodeId);
      if (srcNode && srcNode.type !== 'end') {
        AF.startConnection(nodeEl.dataset.nodeId, portEl.dataset.side, e.clientX, e.clientY);
        _canvas.querySelectorAll('.canvas-node').forEach(function (n) {
          if (n.id === nodeEl.id) return;
          var nd = AF.store.getNode(n.id);
          if (nd && nd.type !== 'start') n.classList.add('drop-target');
        });
        e.preventDefault();
      }
      return;
    }

    var node = AF.store.getNode(nodeEl.dataset.nodeId);
    if (!node) return;

    var rect = _canvasContainer.getBoundingClientRect();
    var zoom = AF.store.get('zoom');
    var panX = AF.store.get('panX'), panY = AF.store.get('panY');
    dragOffX = (e.clientX - rect.left - panX) / zoom - node.x;
    dragOffY = (e.clientY - rect.top  - panY) / zoom - node.y;
    didMove  = false;
    dragging = { nodeId: nodeEl.dataset.nodeId, nodeEl: nodeEl };
    nodeEl.classList.add('dragging');
    e.stopPropagation();
  });

  window.addEventListener('mousemove', function (e) {
    if (AF.isConnecting()) {
      AF.updateConnection(e.clientX, e.clientY);
      _canvas.querySelectorAll('.node-port.port-highlight').forEach(function (p) {
        p.classList.remove('port-highlight');
      });
      var hover = document.elementFromPoint(e.clientX, e.clientY);
      var hoverNode = hover && hover.closest('.canvas-node');
      if (hoverNode && hoverNode.id !== AF.connectingSourceId()) {
        var side = AF.nearestPortSide(hoverNode, e.clientX, e.clientY);
        var port = hoverNode.querySelector('.node-port[data-side="' + side + '"]');
        if (port) port.classList.add('port-highlight');
      }
      return;
    }
    if (!dragging) return;
    didMove = true;
    var rect = _canvasContainer.getBoundingClientRect();
    var zoom = AF.store.get('zoom');
    var panX = AF.store.get('panX'), panY = AF.store.get('panY');
    var x = snap((e.clientX - rect.left - panX) / zoom - dragOffX);
    var y = snap((e.clientY - rect.top  - panY) / zoom - dragOffY);
    AF.store.moveNode(dragging.nodeId, x, y);
    dragging.nodeEl.style.left = x + 'px';
    dragging.nodeEl.style.top  = y + 'px';
    AF.renderEdges();
  });

  window.addEventListener('mouseup', function (e) {
    if (AF.isConnecting()) {
      // clear drop-target highlights
      _canvas.querySelectorAll('.drop-target').forEach(function (n) { n.classList.remove('drop-target'); });
      var tgt     = document.elementFromPoint(e.clientX, e.clientY);
      var tgtNode = tgt && tgt.closest('.canvas-node');
      if (tgtNode && tgtNode.id !== AF.connectingSourceId()) {
        var tgtData = AF.store.getNode(tgtNode.dataset.nodeId);
        if (tgtData && tgtData.type !== 'start') {
          var tgtPort = tgt && tgt.closest('.node-port');
          var targetSide = tgtPort
            ? tgtPort.dataset.side
            : AF.nearestPortSide(tgtNode, e.clientX, e.clientY);
          AF.endConnection(tgtNode.dataset.nodeId, targetSide);
        } else {
          AF.cancelConnection();
        }
      } else {
        AF.cancelConnection();
      }
      return;
    }
    if (!dragging) return;
    dragging.nodeEl.classList.remove('dragging');
    if (!didMove) AF.store.select(dragging.nodeId, 'node');
    dragging = null;
  });

  _canvas.addEventListener('contextmenu', function (e) {
    var nodeEl = e.target.closest('.canvas-node');
    if (!nodeEl) return;
    e.preventDefault();
    AF.store.select(nodeEl.dataset.nodeId, 'node');
    window.dispatchEvent(new CustomEvent('show-context-menu', {
      detail:{ cx:e.clientX, cy:e.clientY, type:'node', id:nodeEl.dataset.nodeId }
    }));
  });
}

/* ── Sync store → DOM ── */
function syncNodes() {
  var nodes   = AF.store.get('nodes');
  var nodeIds = new Set(nodes.map(function (n) { return n.id; }));

  Array.from(_canvas.querySelectorAll('.canvas-node')).forEach(function (el) {
    if (!nodeIds.has(el.id)) el.remove();
  });

  nodes.forEach(function (node) {
    var el = document.getElementById(node.id);
    if (!el) { el = AF.buildNodeEl(node); _canvas.appendChild(el); }
    else      { AF.updateNodeEl(el, node); }
    el.classList.toggle('selected',
      AF.store.get('selectedId') === node.id && AF.store.get('selectedType') === 'node');
  });

  _hint.style.display = nodes.length ? 'none' : '';
}

function onSelectionChange() {
  _canvas.querySelectorAll('.canvas-node').forEach(function (el) {
    el.classList.toggle('selected',
      AF.store.get('selectedType') === 'node' && el.id === AF.store.get('selectedId'));
  });
}

/* ── Keyboard ── */
function bindKeyboard() {
  window.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      var id = AF.store.get('selectedId'), type = AF.store.get('selectedType');
      if (id && type === 'node') AF.store.deleteNode(id);
      if (id && type === 'edge') AF.store.deleteEdge(id);
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); AF.store.undo(); }
      if (e.key === 'y' || (e.shiftKey && e.key === 'z')) { e.preventDefault(); AF.store.redo(); }
    }
  });
}

/* ── Toolbar actions ── */
AF.zoomIn    = function () { AF.store.setZoom(AF.store.get('zoom') * 1.15); };
AF.zoomOut   = function () { AF.store.setZoom(AF.store.get('zoom') / 1.15); };
AF.fitScreen = function () {
  var nodes = AF.store.get('nodes');
  if (!nodes.length) { AF.store.setZoom(1); AF.store.setPan(60,60); return; }
  var minX = Math.min.apply(null, nodes.map(function(n){return n.x;}));
  var minY = Math.min.apply(null, nodes.map(function(n){return n.y;}));
  var maxX = Math.max.apply(null, nodes.map(function(n){return n.x+180;}));
  var maxY = Math.max.apply(null, nodes.map(function(n){return n.y+100;}));
  var cw = _canvasContainer.offsetWidth - 80, ch = _canvasContainer.offsetHeight - 80;
  var zoom = Math.min(cw/(maxX-minX), ch/(maxY-minY), 2);
  AF.store.setZoom(zoom);
  AF.store.setPan(40 - minX*zoom, 40 - minY*zoom);
};

AF.autoLayout = function () {
  var nodes = AF.store.get('nodes');
  var edges = AF.store.get('edges');
  if (!nodes.length) return;

  var inDeg = {};
  nodes.forEach(function (n) { inDeg[n.id] = 0; });
  edges.forEach(function (e) { if (inDeg[e.target] !== undefined) inDeg[e.target]++; });

  var levels  = {};
  var visited = new Set();
  var queue   = nodes.filter(function (n) { return inDeg[n.id] === 0; }).map(function (n) { return { id:n.id, level:0 }; });

  while (queue.length) {
    var cur = queue.shift();
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    levels[cur.id] = cur.level;
    edges.filter(function (e) { return e.source === cur.id; }).forEach(function (e) {
      if (!visited.has(e.target)) queue.push({ id:e.target, level:cur.level+1 });
    });
  }
  nodes.filter(function (n) { return levels[n.id] === undefined; }).forEach(function (n, i) { levels[n.id] = i; });

  var colCount = {};
  nodes.forEach(function (n) {
    var lv = levels[n.id] || 0;
    colCount[lv] = colCount[lv] || 0;
    AF.store.moveNode(n.id, 80 + lv*240, 80 + colCount[lv]*130);
    colCount[lv]++;
  });
  syncNodes(); AF.renderEdges();
};

/* ── Minimap ── */
function initMinimap() {
  _minimapCanvas = document.getElementById('minimap-canvas');
  _minimapCtx    = _minimapCanvas.getContext('2d');
  AF.store.on('nodes', paintMinimap);
  AF.store.on('edges', paintMinimap);
}

function paintMinimap() {
  if (!_minimapCtx) return;
  var mw = _minimapCanvas.offsetWidth  || 160;
  var mh = _minimapCanvas.offsetHeight || 100;
  _minimapCanvas.width  = mw;
  _minimapCanvas.height = mh;
  var ctx   = _minimapCtx;
  var nodes = AF.store.get('nodes');
  ctx.clearRect(0,0,mw,mh);
  if (!nodes.length) return;

  var minX = Math.min.apply(null, nodes.map(function(n){return n.x;}));
  var minY = Math.min.apply(null, nodes.map(function(n){return n.y;}));
  var maxX = Math.max.apply(null, nodes.map(function(n){return n.x+180;}));
  var maxY = Math.max.apply(null, nodes.map(function(n){return n.y+100;}));
  var scale = Math.min(mw/(maxX-minX+40), mh/(maxY-minY+40), 1);

  var catColors = { agent:'#4a7cff',work:'#2ecc71',infra:'#9b59b6',control:'#f39c12',start:'#1abc9c',end:'#e74c3c' };
  nodes.forEach(function (n) {
    ctx.fillStyle   = catColors[n.category] || '#8b95b0';
    ctx.globalAlpha = 0.7;
    ctx.fillRect((n.x-minX+20)*scale, (n.y-minY+20)*scale, 20, 10);
  });
  ctx.globalAlpha = 1;
}

function snap(v) { return Math.round(v/GRID)*GRID; }
