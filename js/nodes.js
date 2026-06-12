/* js/nodes.js — builds and updates canvas node DOM elements */
window.AF = window.AF || {};

var BODY_FIELDS = {
  'agent':           ['model','role'],
  'sub-agent':       ['specialization','parentAgent'],
  'supervisor':      ['coordinationStrategy','model'],
  'router':          ['routingStrategy','confidenceThreshold'],
  'evaluator':       ['scoreThreshold','model'],
  'planner':         ['planningStrategy','model'],
  'executor':        ['executionMode','maxRetries'],
  'critic':          ['critiqueFocus','model'],
  'task':            ['assignedAgent','retryPolicy'],
  'llm-task':        ['model','temperature'],
  'tool-task':       ['toolName','auth'],
  'api-task':        ['method','url'],
  'rag-task':        ['searchType','topK'],
  'human-approval':  ['approverRole','timeout'],
  'notification':    ['channel','recipient'],
  'decision':        ['conditionType'],
  'loop':            ['loopType','maxIterations'],
  'parallel':        ['branches','waitForAll'],
  'merge':           ['mergeStrategy'],
  'memory':          ['memoryType','scope'],
  'knowledge-base':  ['source','indexType'],
  'tool-registry':   ['accessControl'],
  'guardrail':       ['guardrailType','action'],
  'credential':      ['credentialType'],
  'webhook':         ['method','url'],
  'external-system': ['systemType'],
  'start':           ['trigger'],
  'end':             ['returnFormat'],
};

var PORT_SIDES = ['top', 'right', 'bottom', 'left'];

function portMarkup(side) {
  return '<div class="port-anchor port-anchor-' + side + '">'
    + '<div class="node-port" data-side="' + side + '"><div class="port-dot"></div></div>'
    + '</div>';
}

AF.buildNodeEl = function (node) {
  var fields = BODY_FIELDS[node.type] || [];

  var el = document.createElement('div');
  el.className         = 'canvas-node';
  el.id                = node.id;
  el.dataset.category  = node.category;
  el.dataset.type      = node.type;
  el.dataset.nodeId    = node.id;
  el.style.left        = node.x + 'px';
  el.style.top         = node.y + 'px';

  var ports = PORT_SIDES.map(portMarkup).join('');

  if (node.type === 'start' || node.type === 'end') {
    el.innerHTML =
      ports
      + '<div class="node-main node-circle" data-drag-handle>'
      + '<div class="circle-icon">' + node.icon + '</div>'
      + '<div class="circle-label">' + node.label + '</div>'
      + '</div>';
  } else {
    el.innerHTML =
      ports
      + '<div class="node-main">'
      + '<div class="node-header" data-drag-handle>'
      + '<div class="nh-icon">' + node.icon + '</div>'
      + '<div class="nh-title">' + node.label + '</div>'
      + '<div class="nh-type">' + fmtType(node.type) + '</div>'
      + '</div>'
      + '<div class="node-body">' + renderBody(fields, node.props) + '</div>'
      + '</div>';
  }

  return el;
};

AF.updateNodeEl = function (el, node) {
  if (!el) return;
  el.style.left = node.x + 'px';
  el.style.top  = node.y + 'px';
  if (node.type === 'start' || node.type === 'end') {
    var lbl = el.querySelector('.circle-label');
    if (lbl) lbl.textContent = node.label;
  } else {
    var fields = BODY_FIELDS[node.type] || [];
    el.querySelector('.nh-title').textContent = node.label;
    el.querySelector('.node-body').innerHTML  = renderBody(fields, node.props);
  }
};

function renderBody(fields, props) {
  var rows = fields
    .filter(function (k) { return props[k] !== undefined && props[k] !== '' && props[k] !== null; })
    .map(function (k) {
      var val = props[k];
      if (Array.isArray(val)) val = val.length ? val.length + ' items' : '—';
      if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
      if (String(val).length > 18) val = String(val).slice(0, 16) + '…';
      return '<div class="node-field"><span class="field-key">' + fmtKey(k) + '</span><span class="field-val">' + val + '</span></div>';
    });
  return rows.length ? rows.join('') : '<div class="empty-note">Click to configure</div>';
}

function fmtKey(k)  { return k.replace(/([A-Z])/g,' $1').replace(/^./,function(s){return s.toUpperCase();}).trim(); }
function fmtType(t) { return t.replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}); }
