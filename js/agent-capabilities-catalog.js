/* js/agent-capabilities-catalog.js — agent gateway/plugin/tool tree from Angular host */
window.AF = window.AF || {};

(function () {
  var _catalog = { schema: 'agent-capabilities/v1', gateways: [], source: 'none' };
  var _ready = false;
  var _hostReceived = false;
  var _readyWaiters = [];

  function normalizeCatalog(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.schema !== 'agent-capabilities/v1') return null;
    var gateways = Array.isArray(data.gateways) ? data.gateways : [];
    return {
      schema: 'agent-capabilities/v1',
      source: data.source || 'external',
      updatedAt: data.updatedAt || null,
      gateways: gateways.filter(function (g) { return g && (g._id || g.gateway_id); }),
    };
  }

  function emitReady() {
    _ready = true;
    _readyWaiters.splice(0).forEach(function (fn) { fn(_catalog); });
    window.dispatchEvent(new CustomEvent('af-agent-capabilities-ready', { detail: _catalog }));
  }

  AF.agentCapabilities = {
    init: function () {
      if (AF.embed && AF.embed.isEmbed) {
        this.requestFromHost();
        window.setTimeout(function () {
          if (!_hostReceived && !_ready) emitReady();
        }, 800);
      } else {
        emitReady();
      }
    },

    isReady: function () { return _ready; },

    whenReady: function (fn) {
      if (_ready) fn(_catalog);
      else _readyWaiters.push(fn);
    },

    getCatalog: function () { return _catalog; },

    setCatalog: function (data) {
      var cat = normalizeCatalog(data);
      if (!cat) return;
      _catalog = cat;
      _hostReceived = true;
      if (!_ready) emitReady();
      else window.dispatchEvent(new CustomEvent('af-agent-capabilities-updated', { detail: _catalog }));
    },

    requestFromHost: function () {
      if (AF.embed && AF.embed.isEmbed && AF.embed.postToParent) {
        AF.embed.postToParent('FLOW_REQUEST_AGENT_CAPABILITIES', { schema: 'agent-capabilities/v1' });
      }
    },
  };
})();
