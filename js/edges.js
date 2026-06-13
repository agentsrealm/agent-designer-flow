/* js/edges.js — SVG edge rendering, connection dragging, and waypoint bend-point editing */
window.AF = window.AF || {};

var _svg, _connectLine, _connecting, _rewiring;
var _draggingWaypoint = null; // { edgeId, index, origX, origY, startMouseX, startMouseY, origWaypoints }
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
  AF.store.on('selection', AF.renderEdges);
  _svg.addEventListener('mousedown', function (e) {
    if (e.target === _svg && e.button === 0) AF.store.deselect();
  });

  // Bind waypoint drag handlers once at init time
  window.addEventListener('mousemove', function (e) {
    if (!_draggingWaypoint) return;
    var p = clientToSvg(e.clientX, e.clientY);
    var zoom = AF.store.get('zoom');
    // Delta is in SVG screen coords; divide by zoom to get world-coord delta
    var dx = (p.x - _draggingWaypoint.startMouseX) / zoom;
    var dy = (p.y - _draggingWaypoint.startMouseY) / zoom;
    var wps = _draggingWaypoint.origWaypoints.map(function (w) { return { x: w.x, y: w.y }; });
    wps[_draggingWaypoint.index] = {
      x: _draggingWaypoint.origX + dx,
      y: _draggingWaypoint.origY + dy,
    };
    // Mutate edge directly for real-time update without pushing undo on every frame
    var edge = AF.store.getEdge(_draggingWaypoint.edgeId);
    if (edge) {
      edge.waypoints = wps;
      AF.renderEdges();
    }
  });

  window.addEventListener('mouseup', function (e) {
    if (!_draggingWaypoint) return;
    var edge = AF.store.getEdge(_draggingWaypoint.edgeId);
    if (edge) {
      // Push undo-able commit
      AF.store.updateEdge(_draggingWaypoint.edgeId, { waypoints: edge.waypoints.slice() });
    }
    _draggingWaypoint = null;
  });

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

// Build a polyline path string through an array of points [{x,y}, ...]
function polylinePath(points) {
  if (!points || points.length === 0) return '';
  var d = 'M ' + points[0].x + ' ' + points[0].y;
  for (var i = 1; i < points.length; i++) {
    d += ' L ' + points[i].x + ' ' + points[i].y;
  }
  return d;
}

// Find which segment index a point is nearest to.
// segments defined by consecutive points in the array.
// Returns the index of the segment start (0-based), so insert after index i means insert at position i+1 in waypoints.
function nearestSegmentIndex(points, px, py) {
  var bestIdx = 0, bestDist = Infinity;
  for (var i = 0; i < points.length - 1; i++) {
    var ax = points[i].x, ay = points[i].y;
    var bx = points[i + 1].x, by = points[i + 1].y;
    var d = pointToSegmentDistSq(px, py, ax, ay, bx, by);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function pointToSegmentDistSq(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay;
  var lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    var ex = px - ax, ey = py - ay;
    return ex * ex + ey * ey;
  }
  var t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  var nx = ax + t * dx - px;
  var ny = ay + t * dy - py;
  return nx * nx + ny * ny;
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

    var ports = autoPorts(srcNode, tgtNode);
    var srcSide = edge.sourcePort || ports.sourcePort;
    var tgtSide = edge.targetPort || ports.targetPort;

    var p1 = portCenter(srcEl, srcSide) || portPos(srcEl, srcNode, srcSide, zoom, panX, panY);
    var p2 = portCenter(tgtEl, tgtSide) || portPos(tgtEl, tgtNode, tgtSide, zoom, panX, panY);
    var start = trimPoint(p2.x, p2.y, p1.x, p1.y, 5);
    var end   = trimPoint(p1.x, p1.y, p2.x, p2.y, 6);

    // Waypoints are stored in world coords (same as node.x/y).
    // Convert to SVG screen coords for rendering: screenX = worldX * zoom + panX
    var waypoints = (edge.waypoints && edge.waypoints.length > 0) ? edge.waypoints : null;
    var waypointsScreen = waypoints
      ? waypoints.map(function (wp) { return { x: wp.x * zoom + panX, y: wp.y * zoom + panY }; })
      : null;

    var pathD;
    if (waypointsScreen) {
      pathD = polylinePath([start].concat(waypointsScreen).concat([end]));
    } else {
      pathD = bezier(start.x, start.y, end.x, end.y, srcSide, tgtSide);
    }

    var edgeDef = AF.EDGE_TYPES.find(function (e) { return e.value === (edge.type || 'control'); }) || AF.EDGE_TYPES[0];
    var isSelected = AF.store.get('selectedType') === 'edge' && AF.store.get('selectedId') === edge.id;

    var g = svgEl('g');
    g.className.baseVal = 'edge-group' + (isSelected ? ' selected' : '');
    g.dataset.edgeId    = edge.id;

    function selectEdge(e) {
      e.stopPropagation();
      AF.store.select(edge.id, 'edge');
    }

    var hit = svgEl('path');
    hit.setAttribute('d', pathD);
    hit.className.baseVal = 'edge-hit';
    hit.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      selectEdge(e);
    });
    hit.addEventListener('click', selectEdge);
    hit.addEventListener('contextmenu', function (e) {
      e.preventDefault(); e.stopPropagation();
      AF.store.select(edge.id, 'edge');
      window.dispatchEvent(new CustomEvent('show-context-menu', { detail:{ cx:e.clientX, cy:e.clientY, type:'edge', id:edge.id } }));
    });

    g.appendChild(hit);

    var path = svgEl('path');
    path.setAttribute('d', pathD);
    path.className.baseVal = 'edge-path ' + edgeDef.css;
    path.setAttribute('marker-end', 'url(#arrow-' + edgeDef.value + ')');
    g.appendChild(path);

    if (isSelected) {
      // Source/target endpoint handles (existing rewire handles)
      [
        { end: 'source', pt: p1 },
        { end: 'target', pt: p2 },
      ].forEach(function (handle) {
        var c = svgEl('circle');
        c.setAttribute('cx', handle.pt.x);
        c.setAttribute('cy', handle.pt.y);
        c.setAttribute('r', 6);
        c.className.baseVal = 'edge-endpoint edge-endpoint-' + handle.end;
        c.dataset.end = handle.end;
        c.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          AF.store.select(edge.id, 'edge');
          AF.startRewire(edge.id, handle.end, e.clientX, e.clientY);
        });
        g.appendChild(c);
      });

      // Waypoint handles — positioned using screen coords, but origX/Y stored in world coords
      if (waypoints && waypointsScreen) {
        waypoints.forEach(function (wp, idx) {
          var wps = waypointsScreen[idx];
          var wc = svgEl('circle');
          wc.setAttribute('cx', wps.x);
          wc.setAttribute('cy', wps.y);
          wc.setAttribute('r', 6);
          wc.className.baseVal = 'waypoint-handle';

          // Mousedown: start drag — store world-coord origin so pan/zoom don't skew the drag
          wc.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            var mouseStart = clientToSvg(e.clientX, e.clientY);
            _draggingWaypoint = {
              edgeId: edge.id,
              index: idx,
              origX: wp.x,   // world coords
              origY: wp.y,   // world coords
              startMouseX: mouseStart.x,  // SVG screen coords
              startMouseY: mouseStart.y,
              origWaypoints: waypoints.map(function (w) { return { x: w.x, y: w.y }; }),
            };
          });

          // Right-click: delete this waypoint
          wc.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var newWps = waypoints.slice();
            newWps.splice(idx, 1);
            AF.store.updateEdge(edge.id, { waypoints: newWps });
          });

          g.appendChild(wc);
        });
      }
    }

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
  clearPortHighlights();
};

function clearPortHighlights() {
  document.querySelectorAll('.node-port.port-highlight').forEach(function (p) {
    p.classList.remove('port-highlight');
  });
}

function clearDropTargets() {
  document.querySelectorAll('.canvas-node.drop-target').forEach(function (n) {
    n.classList.remove('drop-target');
  });
}

function updatePortHighlight(clientX, clientY, excludeNodeId) {
  clearPortHighlights();
  var hover = document.elementFromPoint(clientX, clientY);
  var hoverNode = hover && hover.closest('.canvas-node');
  if (hoverNode && hoverNode.id !== excludeNodeId) {
    var side = AF.nearestPortSide(hoverNode, clientX, clientY);
    var port = hoverNode.querySelector('.node-port[data-side="' + side + '"]');
    if (port) port.classList.add('port-highlight');
  }
}

function markValidDropTargets(excludeNodeId, end) {
  clearDropTargets();
  document.querySelectorAll('.canvas-node').forEach(function (n) {
    if (n.id === excludeNodeId) return;
    var nd = AF.store.getNode(n.id);
    if (!nd) return;
    if (end === 'target' && nd.type === 'start') return;
    if (end === 'source' && nd.type === 'end') return;
    n.classList.add('drop-target');
  });
}

AF.startRewire = function (edgeId, end, clientX, clientY) {
  var edge = AF.store.getEdge(edgeId);
  if (!edge) return;

  var fixedEnd = end === 'source' ? 'target' : 'source';
  var fixedNodeId = edge[fixedEnd];
  var auto = autoPorts(AF.store.getNode(edge.source), AF.store.getNode(edge.target));
  var fixedSide = edge[fixedEnd + 'Port'] || (fixedEnd === 'source' ? auto.sourcePort : auto.targetPort);

  var fixedEl = document.getElementById(fixedNodeId);
  var fixedPt = fixedEl
    ? (portCenter(fixedEl, fixedSide) || clientToSvg(clientX, clientY))
    : clientToSvg(clientX, clientY);

  var zoom = AF.store.get('zoom'), panX = AF.store.get('panX'), panY = AF.store.get('panY');
  var waypointsScreen = (edge.waypoints && edge.waypoints.length > 0)
    ? edge.waypoints.map(function (wp) { return { x: wp.x * zoom + panX, y: wp.y * zoom + panY }; })
    : [];

  _rewiring = {
    edgeId: edgeId,
    end: end,
    fixedNodeId: fixedNodeId,
    fixedSide: fixedSide,
    fixedX: fixedPt.x,
    fixedY: fixedPt.y,
    dragSide: edge[end + 'Port'] || fixedSide,
    waypointsScreen: waypointsScreen,
  };

  if (!_connectLine) {
    _connectLine = svgEl('path');
    _connectLine.id = 'connect-line';
    _svg.appendChild(_connectLine);
  }
  _connectLine.style.display = '';
  markValidDropTargets(fixedNodeId, end);
  AF.updateRewire(clientX, clientY);
};

AF.updateRewire = function (clientX, clientY) {
  if (!_rewiring || !_connectLine) return;

  var p = clientToSvg(clientX, clientY);
  var dragSide = _rewiring.dragSide;
  var snapSide = sideToward(_rewiring.fixedX, _rewiring.fixedY, p.x, p.y);

  var el = document.elementFromPoint(clientX, clientY);
  var nodeEl = el && el.closest('.canvas-node');
  if (nodeEl && nodeEl.id !== _rewiring.fixedNodeId) {
    snapSide = AF.nearestPortSide(nodeEl, clientX, clientY);
    var snap = portCenter(nodeEl, snapSide);
    if (snap) p = snap;
    dragSide = snapSide;
  }

  var wps = _rewiring.waypointsScreen;
  if (wps && wps.length > 0) {
    // Preserve existing waypoints in the preview; dragged end connects via straight segments
    var pts = _rewiring.end === 'source'
      ? [p].concat(wps).concat([{ x: _rewiring.fixedX, y: _rewiring.fixedY }])
      : [{ x: _rewiring.fixedX, y: _rewiring.fixedY }].concat(wps).concat([p]);
    _connectLine.setAttribute('d', polylinePath(pts));
  } else if (_rewiring.end === 'source') {
    _connectLine.setAttribute('d', bezier(p.x, p.y, _rewiring.fixedX, _rewiring.fixedY, dragSide, _rewiring.fixedSide));
  } else {
    _connectLine.setAttribute('d', bezier(_rewiring.fixedX, _rewiring.fixedY, p.x, p.y, _rewiring.fixedSide, dragSide));
  }

  updatePortHighlight(clientX, clientY, _rewiring.fixedNodeId);
};

AF.endRewire = function (clientX, clientY) {
  if (!_rewiring) return;

  var edge = AF.store.getEdge(_rewiring.edgeId);
  var tgt = document.elementFromPoint(clientX, clientY);
  var tgtNode = tgt && tgt.closest('.canvas-node');

  if (edge && tgtNode && tgtNode.id !== _rewiring.fixedNodeId) {
    var tgtData = AF.store.getNode(tgtNode.dataset.nodeId);
    var tgtPort = tgt && tgt.closest('.node-port');
    var side = tgtPort
      ? tgtPort.dataset.side
      : AF.nearestPortSide(tgtNode, clientX, clientY);

    var ok = true;
    if (_rewiring.end === 'source') {
      ok = tgtData && tgtData.type !== 'end' && tgtNode.id !== edge.target;
      if (ok) AF.store.updateEdge(edge.id, { source: tgtNode.id, sourcePort: side });
    } else {
      ok = tgtData && tgtData.type !== 'start' && tgtNode.id !== edge.source;
      if (ok) AF.store.updateEdge(edge.id, { target: tgtNode.id, targetPort: side });
    }
    if (ok) AF.store.select(edge.id, 'edge');
  }

  AF.cancelRewire();
};

AF.cancelRewire = function () {
  _rewiring = null;
  if (_connectLine) _connectLine.style.display = 'none';
  clearPortHighlights();
  clearDropTargets();
};

AF.addWaypointAtClient = function (edgeId, clientX, clientY) {
  var edge = AF.store.getEdge(edgeId);
  if (!edge) return;
  var p = clientToSvg(clientX, clientY);

  var srcNode = AF.store.getNode(edge.source);
  var tgtNode = AF.store.getNode(edge.target);
  if (!srcNode || !tgtNode) return;
  var srcEl = document.getElementById(edge.source);
  var tgtEl = document.getElementById(edge.target);
  var zoom = AF.store.get('zoom'), panX = AF.store.get('panX'), panY = AF.store.get('panY');
  var ports = autoPorts(srcNode, tgtNode);
  var p1 = (srcEl && portCenter(srcEl, edge.sourcePort || ports.sourcePort)) || portPos(srcEl, srcNode, edge.sourcePort || ports.sourcePort, zoom, panX, panY);
  var p2 = (tgtEl && portCenter(tgtEl, edge.targetPort || ports.targetPort)) || portPos(tgtEl, tgtNode, edge.targetPort || ports.targetPort, zoom, panX, panY);
  var start = trimPoint(p2.x, p2.y, p1.x, p1.y, 5);
  var end   = trimPoint(p1.x, p1.y, p2.x, p2.y, 6);

  var currentWps = (edge.waypoints && edge.waypoints.length > 0) ? edge.waypoints.slice() : [];
  // Convert existing world-coord waypoints to screen coords for segment lookup
  var currentWpsScreen = currentWps.map(function (wp) { return { x: wp.x * zoom + panX, y: wp.y * zoom + panY }; });
  var allPoints = [start].concat(currentWpsScreen).concat([end]);
  var segIdx = nearestSegmentIndex(allPoints, p.x, p.y);
  // Convert click point from SVG screen coords to world coords before storing
  var newWpWorld = { x: (p.x - panX) / zoom, y: (p.y - panY) / zoom };
  var newWps = currentWps.slice();
  newWps.splice(segIdx, 0, newWpWorld);
  AF.store.updateEdge(edgeId, { waypoints: newWps });
};

AF.isConnecting        = function () { return !!_connecting; };
AF.isRewiring          = function () { return !!_rewiring; };
AF.isDraggingWaypoint  = function () { return !!_draggingWaypoint; };
AF.connectingSourceId  = function () { return _connecting ? _connecting.sourceId : null; };

function svgEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }
