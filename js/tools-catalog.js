/* js/tools-catalog.js — runtime tool list (mock + Angular host via postMessage) */
window.AF = window.AF || {};

(function () {
  var MOCK_URL = 'data/tools-catalog.mock.json';
  var PAGE_SIZE = 5;
  var _catalog = { schema: 'agent-tools/v1', tools: [], source: 'none' };
  var _ready = false;
  var _readyWaiters = [];
  var _hostCatalogReceived = false;

  function normalizeCatalog(data) {
    if (!data || typeof data !== 'object') return null;
    var tools = Array.isArray(data.tools) ? data.tools : [];
    return {
      schema: data.schema || 'agent-tools/v1',
      source: data.source || 'external',
      updatedAt: data.updatedAt || null,
      tools: tools.filter(function (t) { return t && (t.id || t.name); }).map(function (t) {
        return {
          id: t.id || t.name,
          name: t.name || t.id,
          displayName: t.displayName || t.name || t.id,
          description: t.description || '',
          pluginId: t.pluginId || '',
          pluginName: t.pluginName || '',
          category: t.category || '',
          auth: t.auth || 'none',
          endpoint: t.endpoint || '',
        };
      }),
    };
  }

  function applyCatalog(data, source) {
    var cat = normalizeCatalog(data);
    if (!cat) return false;
    _catalog = cat;
    _catalog.source = source || cat.source || 'mock';
    return true;
  }

  function emitReady() {
    _ready = true;
    _readyWaiters.splice(0).forEach(function (fn) { fn(_catalog); });
    window.dispatchEvent(new CustomEvent('af-tools-catalog-ready', { detail: _catalog }));
  }

  function refreshFromJson() {
    if (typeof location !== 'undefined' && location.protocol === 'file:') return;
    fetch(MOCK_URL)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (applyCatalog(data, 'mock')) {
          window.dispatchEvent(new CustomEvent('af-tools-catalog-updated', { detail: _catalog }));
        }
      })
      .catch(function () {});
  }

  function loadMock() {
    if (AF.MOCK_TOOLS_CATALOG && applyCatalog(AF.MOCK_TOOLS_CATALOG, 'mock')) {
      emitReady();
      refreshFromJson();
      return Promise.resolve(_catalog);
    }

    return fetch(MOCK_URL)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data) applyCatalog(data, 'mock');
        emitReady();
        return _catalog;
      })
      .catch(function () {
        emitReady();
        return _catalog;
      });
  }

  AF.toolsCatalog = {
    PAGE_SIZE: PAGE_SIZE,

    init: function () {
      if (AF.embed && AF.embed.isEmbed) {
        AF.toolsCatalog.requestFromHost();
        window.setTimeout(function () {
          if (!_hostCatalogReceived && (!_ready || !_catalog.tools.length)) loadMock();
        }, 800);
      } else {
        loadMock();
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
      _hostCatalogReceived = true;
      _catalog = cat;
      if (!_ready) emitReady();
      else window.dispatchEvent(new CustomEvent('af-tools-catalog-updated', { detail: _catalog }));
    },

    requestFromHost: function () {
      if (AF.embed && AF.embed.isEmbed && AF.embed.postToParent) {
        AF.embed.postToParent('FLOW_REQUEST_TOOLS', { schema: 'agent-tools/v1' });
      }
    },

    search: function (query) {
      var q = (query || '').trim().toLowerCase();
      var tools = _catalog.tools || [];
      if (!q) return tools.slice();
      return tools.filter(function (t) {
        return (t.displayName || '').toLowerCase().indexOf(q) !== -1
          || (t.name || '').toLowerCase().indexOf(q) !== -1
          || (t.description || '').toLowerCase().indexOf(q) !== -1
          || (t.pluginName || '').toLowerCase().indexOf(q) !== -1
          || (t.category || '').toLowerCase().indexOf(q) !== -1;
      });
    },

    page: function (items, page) {
      var p = Math.max(1, page || 1);
      var start = (p - 1) * PAGE_SIZE;
      return {
        items: items.slice(start, start + PAGE_SIZE),
        page: p,
        pageSize: PAGE_SIZE,
        total: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
      };
    },

    findById: function (id) {
      if (!id) return null;
      return (_catalog.tools || []).find(function (t) { return t.id === id || t.name === id; }) || null;
    },

    propsFromTool: function (tool) {
      if (!tool) return {};
      return {
        toolId: tool.id,
        toolName: tool.name,
        toolDisplayName: tool.displayName,
        toolDescription: tool.description,
        pluginId: tool.pluginId,
        pluginName: tool.pluginName,
        endpoint: tool.endpoint || '',
        auth: tool.auth || 'none',
        name: tool.displayName || tool.name,
      };
    },
  };
})();
