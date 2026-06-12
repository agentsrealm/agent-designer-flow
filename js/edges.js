/* js/edges.js — SVG edge rendering and connection dragging */
window.AF = window.AF || {};

var _svg, _connectLine, _connecting;
var PORT_SIDES = ['top', 'right', 'bottom', 'left'];
var SIDE_OUT = {
  top:    [0, -1],
  right:  [1, 0],
  bottom: [0, 1],
  left:   [-1, 0],
};

AF.initEdges = function () {
  _svg = document.getElementById('edges-svg');
  _connectLine = null;
  _connecting  = null;
  injectMarkers();
  AF.store.on('edges', AF.renderEdges);
  AF.store.on('nodes', AF.renderEdges);
  AF.renderEdges();
};

function injectMarkers() {
  var defs = svgEl('defs');
  var colors = { control:'#8b95b0', data:'#4a7cff', delegate:'#9b59b6', tool:'#1abc9c', approval:'#f39c12', fallback:'#e74c3c' };
  AF.EDGE_TYPES.forEach(function (et) {
    var color  = colors[et.value] || '#8b95b0';
    var marker = svgEl('marker');
    marker.setAttribute('id',            'arrow-' + et.value);
    marker.setAttribute('markerWidth',   '6');
    marker.setAttribute('markerHeight',  '6');
    marker.setAttribute('refX',          '5.2');
    marker.setAttribute('refY',          '3');
    marker.setAttribute('orient',        'auto');
    marker.setAttribute('markerUnits',   'userSpaceOnUse');
    var poly = svgEl('polygon');
    poly.setAttribute('points', '0 0.5, 5.5 3, 0 5.5');
    poly.setAttribute('fill',   color);
    marker.appendChild(poly);
    defs.appendChild(marker);
  });
  _svg.appendChild(defs);
}

function containerRect() {
  return document.getElementById('canvas-container').getBoundingClientRect();
}

function clientToSvg(cx, cy) {
  var rect = containerRect();
  return { x: cx - rect.left, y: cy - rect.top };
}

function portCenter(el, side) {
  var dot = el.querySelector('.port-anchor-' + side + ' .port-dot');
  if (dot) {
    var r = dot.getBoundingClientRect();
    return clientToSvg(r.left + r.width / 2, r.top + r.height / 2);
  }
  return null;
}

function autoPorts(srcNode, tgtNode) {
  var dx = tgtNode.x - srcNode.x;
  var dy = tgtNode.y - srcNode.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0
      ? { sourcePort: 'right', targetPort: 'left' }
      : { sourcePort: 'left', targetPort: 'right' };
  }
  return dy > 0
    ? { sourcePort: 'bottom', targetPort: 'top' }
    : { sourcePort: 'top', targetPort: 'bottom' };
}

function sideToward(x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

AF.nearestPortSide = function (nodeEl, clientX, clientY) {
  var p = clientToSvg(clientX, clientY);
  var best = 'top', bestD = Infinity;
  PORT_SIDES.forEach(function (side) {
    var c = portCenter(nodeEl, side);
    if (!c) return;
    var d = (c.x - p.x) * (c.x - p.x) + (c.y - p.y) * (c.y - p.y);
    if (d < bestD) { bestD = d; best = side; }
  });
  return best;
};

AF.renderEdges = function () {
  Array.from(_svg.querySelectorAll('.edge-group')).forEach(function (e) { e.remove(); });

  var zoom = AF.store.get('zoom');
  var panX = AF.store.get('panX');
  var panY = AF.store.get('panY');

  AF.store.get('edges').forEach(function (edge) {
    var srcNode = AF.store.getNode(edge.source);
    var tgtNode = AF.store.getNode(edge.target);
    if (!srcNode || !tgtNode) return;

    var srcEl = document.getElementById(edge.source);
    var tgtEl = document.getElementById(edge.target);
    if (!srcEl || !tgtEl) return;

    var ports = autoPorts(srcNode, tgtNode);
    var srcSide = edge.sourcePort || ports.sourcePort;
    var tgtSide = edge.targetPort || ports.targetPort;

    var p1 = portCenter(srcEl, srcSide) || portPos(srcEl, srcNode, srcSide, zoom, panX, panY);
    var p2 = portCenter(tgtEl, tgtSide) || portPos(tgtEl, tgtNode, tgtSide, zoom, panX, panY);
    var start = trimPoint(p2.x, p2.y, p1.x, p1.y, 5);
    var end   = trimPoint(p1.x, p1.y, p2.x, p2.y, 6);

    var edgeDef = AF.EDGE_TYPES.find(function (e) { return e.value === (edge.type || 'control'); }) || AF.EDGE_TYPES[0];

    var g = svgEl('g');
    g.className.baseVal = 'edge-group';
    g.dataset.edgeId    = edge.id;

    var path = svgEl('path');
    path.setAttribute('d', bezier(start.x, start.y, end.x, end.y, srcSide, tgtSide));
    path.className.baseVal = 'edge-path ' + edgeDef.css;
    path.setAttribute('marker-end', 'url(#arrow-' + edgeDef.value + ')');
    if (AF.store.get('selectedId') === edge.id) path.classList.add('selected');

    path.addEventListener('click', function (e) {
      e.stopPropagation();
      AF.store.select(edge.id, 'edge');
    });
    path.addEventListener('contextmenu', function (e) {
      e.preventDefault(); e.stopPropagation();
      AF.store.select(edge.id, 'edge');
      window.dispatchEvent(new CustomEvent('show-context-menu', { detail:{ cx:e.clientX, cy:e.clientY, type:'edge', id:edge.id } }));
    });
    g.appendChild(path);

    if (edge.label) {
      var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      var bg = svgEl('rect');
      bg.className.baseVal = 'edge-label-bg';
      bg.setAttribute('x', mx-24); bg.setAttribute('y', my-9);
      bg.setAttribute('width','48'); bg.setAttribute('height','14');
      var txt = svgEl('text');
      txt.className.baseVal = 'edge-label';
      txt.setAttribute('x', mx); txt.setAttribute('y', my);
      txt.setAttribute('text-anchor','middle');
      txt.setAttribute('dominant-baseline','middle');
      txt.textContent = edge.label;
      g.appendChild(bg); g.appendChild(txt);
    }
    _svg.appendChild(g);
  });
};

function portPos(el, node, side, zoom, panX, panY) {
  var w = el.offsetWidth  || 170;
  var h = el.offsetHeight || 80;
  var sx = node.x * zoom + panX;
  var sy = node.y * zoom + panY;
  var hw = w * zoom / 2, hh = h * zoom / 2;
  if (side === 'top')    return { x: sx + hw, y: sy };
  if (side === 'bottom') return { x: sx + hw, y: sy + h * zoom };
  if (side === 'left')   return { x: sx, y: sy + hh };
  return { x: sx + w * zoom, y: sy + hh };
}

function bezier(x1, y1, x2, y2, side1, side2) {
  var dist = Math.hypot(x2 - x1, y2 - y1);
  var bend = Math.min(80, Math.max(28, dist * 0.35));
  var o1 = SIDE_OUT[side1] || SIDE_OUT.bottom;
  var o2 = SIDE_OUT[side2] || SIDE_OUT.top;
  return 'M ' + x1 + ' ' + y1
    + ' C ' + (x1 + o1[0] * bend) + ' ' + (y1 + o1[1] * bend)
    + ', ' + (x2 + o2[0] * bend) + ' ' + (y2 + o2[1] * bend)
    + ', ' + x2 + ' ' + y2;
}

function trimPoint(fromX, fromY, toX, toY, dist) {
  var dx = toX - fromX, dy = toY - fromY;
  var len = Math.sqrt(dx * dx + dy * dy);
  if (!len || len <= dist) return { x: toX, y: toY };
  return { x: toX - (dx / len) * dist, y: toY - (dy / len) * dist };
}

AF.startConnection = function (sourceId, sourceSide, clientX, clientY) {
  var p = clientToSvg(clientX, clientY);
  _connecting = { sourceId: sourceId, sourceSide: sourceSide, startX: p.x, startY: p.y };
  if (!_connectLine) {
    _connectLine = svgEl('path');
    _connectLine.id = 'connect-line';
    _svg.appendChild(_connectLine);
  }
  _connectLine.style.display = '';
};

AF.updateConnection = function (clientX, clientY) {
  if (!_connecting || !_connectLine) return;
  var p = clientToSvg(clientX, clientY);
  var targetSide = sideToward(_connecting.startX, _connecting.startY, p.x, p.y);

  var el = document.elementFromPoint(clientX, clientY);
  var nodeEl = el && el.closest('.canvas-node');
  if (nodeEl && nodeEl.id !== _connecting.sourceId) {
    targetSide = AF.nearestPortSide(nodeEl, clientX, clientY);
    var snap = portCenter(nodeEl, targetSide);
    if (snap) p = snap;
  }

  _connectLine.setAttribute('d', bezier(_connecting.startX, _connecting.startY, p.x, p.y, _connecting.sourceSide, targetSide));
};

AF.endConnection = function (targetId, targetSide) {
  if (!_connecting) return;
  if (targetId && targetId !== _connecting.sourceId) {
    AF.store.addEdge({
      id: AF.store.nextEdgeId(),
      source: _connecting.sourceId,
      target: targetId,
      sourcePort: _connecting.sourceSide,
      targetPort: targetSide || 'top',
      type: 'control',
      label: '',
    });
  }
  AF.cancelConnection();
};

AF.cancelConnection = function () {
  _connecting = null;
  if (_connectLine) _connectLine.style.display = 'none';
  document.querySelectorAll('.node-port.port-highlight').forEach(function (p) {
    p.classList.remove('port-highlight');
  });
};

AF.isConnecting       = function () { return !!_connecting; };
AF.connectingSourceId = function () { return _connecting ? _connecting.sourceId : null; };

function svgEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }
