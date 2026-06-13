/* js/catalog-factory.js — shared runtime catalog loader (mock + Angular host) */
window.AF = window.AF || {};

AF.createRuntimeCatalog = function (opts) {
  var PAGE_SIZE = 5;
  var _catalog = { schema: opts.schema, tools: [], source: 'none' };
  var _itemsKey = opts.itemsKey || 'items';
  var _ready = false;
  var _readyWaiters = [];
  var _hostReceived = false;

  function normalizeItem(t) {
    return opts.normalizeItem(t);
  }

  function normalizeCatalog(data) {
    if (!data || typeof data !== 'object') return null;
    var rawItems = Array.isArray(data[_itemsKey]) ? data[_itemsKey]
      : Array.isArray(data.items) ? data.items
      : Array.isArray(data.tools) ? data.tools
      : Array.isArray(data.skills) ? data.skills
      : Array.isArray(data.agents) ? data.agents
      : Array.isArray(data.subflows) ? data.subflows
      : [];
    return {
      schema: data.schema || opts.schema,
      source: data.source || 'external',
      updatedAt: data.updatedAt || null,
      tools: rawItems.filter(function (t) { return t && (t.id || t.name); }).map(normalizeItem),
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
    window.dispatchEvent(new CustomEvent(opts.readyEvent, { detail: _catalog }));
  }

  function emitUpdated() {
    window.dispatchEvent(new CustomEvent(opts.updatedEvent, { detail: _catalog }));
  }

  function refreshFromJson() {
    if (typeof location !== 'undefined' && location.protocol === 'file:') return;
    if (!opts.mockUrl) return;
    fetch(opts.mockUrl)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (applyCatalog(data, 'mock')) emitUpdated();
      })
      .catch(function () {});
  }

  function loadMock() {
    var inline = opts.mockInline && AF[opts.mockInline];
    if (inline && applyCatalog(inline, 'mock')) {
      emitReady();
      refreshFromJson();
      return Promise.resolve(_catalog);
    }
    if (!opts.mockUrl) {
      emitReady();
      return Promise.resolve(_catalog);
    }
    return fetch(opts.mockUrl)
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

  return {
    PAGE_SIZE: PAGE_SIZE,
    schema: opts.schema,

    init: function () {
      if (AF.embed && AF.embed.isEmbed) {
        this.requestFromHost();
        window.setTimeout(function () {
          if (!_hostReceived && (!_ready || !_catalog.tools.length)) loadMock();
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
      if (!applyCatalog(data, (data && data.source) || 'external')) return;
      _hostReceived = true;
      if (!_ready) emitReady();
      else emitUpdated();
    },

    requestFromHost: function () {
      if (AF.embed && AF.embed.isEmbed && AF.embed.postToParent && opts.requestMessage) {
        AF.embed.postToParent(opts.requestMessage, { schema: opts.schema });
      }
    },

    search: function (query, extraFields) {
      var q = (query || '').trim().toLowerCase();
      var tools = _catalog.tools || [];
      if (!q) return tools.slice();
      var fields = ['displayName', 'name', 'description', 'pluginName', 'category', 'role', 'model', 'agentType', 'version', 'nodeCount'];
      if (extraFields) fields = fields.concat(extraFields);
      return tools.filter(function (t) {
        return fields.some(function (f) {
          return String(t[f] || '').toLowerCase().indexOf(q) !== -1;
        });
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

    propsFromItem: opts.propsFromItem,
  };
};
