/* js/palette.js — left panel, palette items, drag-from-palette */
window.AF = window.AF || {};

AF.getItemDef = function (type) {
  for (var g of AF.NODE_GROUPS) {
    var item = g.items.find(i => i.type === type);
    if (item) return item;
  }
  return null;
};

AF.initPalette = function () {
  var content     = document.getElementById('palette-content');
  var searchInput = document.getElementById('palette-search');
  var paletteGroups = AF.NODE_GROUPS.filter(function (g) {
    return g.id !== 'agents' && g.id !== 'infra';
  });

  renderGroups(content, paletteGroups);
  renderConnectionGuide(content);
  initSearch(searchInput, content);
};

function renderGroups(container, groups) {
  container.innerHTML = '';
  groups.forEach(function (group) {
    container.appendChild(createGroup(group));
  });
}

function createGroup(group) {
  var wrap = document.createElement('div');
  wrap.className = 'palette-group';

  var header = document.createElement('div');
  header.className = 'palette-group-header';
  header.innerHTML = '<span>' + group.label + '</span><span class="chevron">▾</span>';
  header.addEventListener('click', function () { toggleGroup(header, body); });

  var body = document.createElement('div');
  body.className = 'palette-group-body';
  group.items.forEach(function (item) { body.appendChild(createItem(item)); });

  wrap.appendChild(header);
  wrap.appendChild(body);
  return wrap;
}

function toggleGroup(header, body) {
  var c = body.classList.toggle('collapsed');
  header.classList.toggle('collapsed', c);
}

function createItem(item) {
  var el = document.createElement('div');
  el.className = 'palette-item';
  el.dataset.type     = item.type;
  el.dataset.category = item.category;
  el.draggable = true;
  el.innerHTML = '<div class="node-icon">' + item.icon + '</div>'
               + '<div><div class="node-label">' + item.label + '</div></div>';
  el._itemDef = item;

  el.addEventListener('dragstart', function (e) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('node-type', item.type);
    var ghost = buildGhost(el);
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 70, 20);
    setTimeout(function () { ghost.remove(); }, 0);
  });

  return el;
}

function buildGhost(item) {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:-200px;left:-200px;'
    + 'background:var(--bg-elevated);border:1.5px solid var(--border);'
    + 'border-radius:8px;padding:6px 10px;display:flex;align-items:center;gap:6px;'
    + 'font-size:12px;color:var(--text-primary);box-shadow:0 4px 12px rgba(0,0,0,.4);'
    + 'font-family:var(--font);';
  el.innerHTML = item.innerHTML;
  return el;
}

/* ── Connection guide + edge legend ── */
function renderConnectionGuide(container) {
  var edgeColors = {
    control:  '#8b95b0',
    data:     '#4a7cff',
    delegate: '#9b59b6',
    tool:     '#1abc9c',
    approval: '#f39c12',
    fallback: '#e74c3c',
  };
  var edgeDashes = { control:false, data:true, delegate:false, tool:true, approval:false, fallback:true };

  var html =
    '<div class="palette-group" id="palette-connect-guide">'
    + '<div class="palette-group-header" id="pgc-header">'
    + '<span>How to Connect</span><span class="chevron">▾</span>'
    + '</div>'
    + '<div class="palette-group-body" id="pgc-body">'

    // instruction steps
    + '<div class="connect-steps">'
    + '<div class="connect-step"><span class="cs-num">1</span><span class="cs-text">Hover a node — connection handles appear on all sides</span></div>'
    + '<div class="connect-step"><span class="cs-num">2</span><span class="cs-text">Drag from any handle to another node</span></div>'
    + '<div class="connect-step"><span class="cs-num">3</span><span class="cs-text">Release on the target — arrow is created</span></div>'
    + '<div class="connect-step"><span class="cs-num">4</span><span class="cs-text">Click a connector to select it — drag its handles to reconnect</span></div>'
    + '</div>'

    // edge legend
    + '<div class="edge-legend-title">Connection Types</div>'
    + AF.EDGE_TYPES.map(function (et) {
        var dash = edgeDashes[et.value] ? '4,3' : '';
        var svg  =
          '<svg width="36" height="12" viewBox="0 0 36 12" style="flex-shrink:0">'
          + '<line x1="0" y1="6" x2="28" y2="6" stroke="' + edgeColors[et.value] + '" stroke-width="2"'
          + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'
          + '<polygon points="24,3 36,6 24,9" fill="' + edgeColors[et.value] + '"/>'
          + '</svg>';
        return '<div class="edge-legend-row">' + svg
          + '<span class="edge-legend-label">' + et.label + '</span>'
          + '</div>';
      }).join('')

    + '</div></div>';

  container.insertAdjacentHTML('beforeend', html);

  // toggle collapse
  var header = document.getElementById('pgc-header');
  var body   = document.getElementById('pgc-body');
  header.addEventListener('click', function () {
    var c = body.classList.toggle('collapsed');
    header.classList.toggle('collapsed', c);
  });
}

function initSearch(input, container) {
  input.addEventListener('input', function () {
    var q = input.value.toLowerCase().trim();
    container.querySelectorAll('.palette-item').forEach(function (el) {
      var label = el.querySelector('.node-label').textContent.toLowerCase();
      el.style.display = (!q || label.includes(q) || el.dataset.type.includes(q)) ? '' : 'none';
    });
    container.querySelectorAll('.palette-group').forEach(function (g) {
      var vis = Array.from(g.querySelectorAll('.palette-item')).some(i => i.style.display !== 'none');
      g.style.display = vis ? '' : 'none';
      if (q) {
        g.querySelector('.palette-group-body').classList.remove('collapsed');
        g.querySelector('.palette-group-header').classList.remove('collapsed');
      }
    });
  });
}
