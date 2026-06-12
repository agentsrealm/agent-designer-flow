/* js/edges.js — SVG edge rendering and connection dragging */
window.AF = window.AF || {};

var _svg, _connectLine, _connecting;

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
    marker.setAttribute('id',           'arrow-' + et.value);
    marker.setAttribute('markerWidth',  '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX',         '9');
    marker.setAttribute('refY',         '3.5');
    marker.setAttribute('orient',       'auto');
    var poly = svgEl('polygon');
    poly.setAttribute('points', '0 0, 10 3.5, 0 7');
    poly.setAttribute('fill',   color);
    marker.appendChild(poly);
    defs.appendChild(marker);
  });
  _svg.appendChild(defs);
}

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

    var p1 = portPos(srcEl, srcNode, 'out', zoom, panX, panY);
    var p2 = portPos(tgtEl, tgtNode, 'in',  zoom, panX, panY);

    var edgeDef = AF.EDGE_TYPES.find(function (e) { return e.value === (edge.type || 'control'); }) || AF.EDGE_TYPES[0];

    var g = svgEl('g');
    g.className.baseVal = 'edge-group';
    g.dataset.edgeId    = edge.id;

    var path = svgEl('path');
    path.setAttribute('d', bezier(p1.x, p1.y, p2.x, p2.y));
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

function portPos(el, node, dir, zoom, panX, panY) {
  var w = el.offsetWidth  || 170;
  var h = el.offsetHeight || 80;
  var sx = node.x * zoom + panX;
  var sy = node.y * zoom + panY;
  if (dir === 'out') return { x: sx + w * zoom / 2, y: sy + h * zoom };
  return                     { x: sx + w * zoom / 2, y: sy };
}

function bezier(x1, y1, x2, y2) {
  var dy = Math.abs(y2 - y1) * 0.5;
  return 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + (y1+dy) + ', ' + x2 + ' ' + (y2-dy) + ', ' + x2 + ' ' + y2;
}

AF.startConnection = function (sourceId, sx, sy) {
  _connecting = { sourceId:sourceId, startX:sx, startY:sy };
  if (!_connectLine) {
    _connectLine = svgEl('path');
    _connectLine.id = 'connect-line';
    _svg.appendChild(_connectLine);
  }
  _connectLine.style.display = '';
};

AF.updateConnection = function (toX, toY) {
  if (!_connecting || !_connectLine) return;
  _connectLine.setAttribute('d', bezier(_connecting.startX, _connecting.startY, toX, toY));
};

AF.endConnection = function (targetId) {
  if (!_connecting) return;
  if (targetId && targetId !== _connecting.sourceId) {
    AF.store.addEdge({ id: AF.store.nextEdgeId(), source: _connecting.sourceId, target: targetId, type:'control', label:'' });
  }
  AF.cancelConnection();
};

AF.cancelConnection = function () {
  _connecting = null;
  if (_connectLine) _connectLine.style.display = 'none';
};

AF.isConnecting       = function () { return !!_connecting; };
AF.connectingSourceId = function () { return _connecting ? _connecting.sourceId : null; };

function svgEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }
