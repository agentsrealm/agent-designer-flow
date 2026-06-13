/* js/entity-picker.js — modal picker for Tool Task, Skill, and work-item Agent nodes */
window.AF = window.AF || {};

(function () {
  var KINDS = {
    tool: {
      catalog: function () { return AF.toolsCatalog; },
      request: function () { AF.toolsCatalog.requestFromHost(); },
      readyEvent: 'af-tools-catalog-ready',
      updatedEvent: 'af-tools-catalog-updated',
      icon: '🔧',
      title: 'Select tool',
      subtitle: 'MCP / API tools from the host application',
      placeholder: 'Search tools by name, plugin, or description…',
      emptyText: 'No tools match your search.',
      noneText: 'No tools found',
      idAttr: 'data-item-id',
    },
    skill: {
      catalog: function () { return AF.skillsCatalog; },
      request: function () { AF.skillsCatalog.requestFromHost(); },
      readyEvent: 'af-skills-catalog-ready',
      updatedEvent: 'af-skills-catalog-updated',
      icon: '♻',
      title: 'Select skill',
      subtitle: 'Reusable skills from the host application',
      placeholder: 'Search skills by name, category, or description…',
      emptyText: 'No skills match your search.',
      noneText: 'No skills found',
      idAttr: 'data-item-id',
    },
    agent: {
      catalog: function () { return AF.agentsCatalog; },
      request: function () { AF.agentsCatalog.requestFromHost(); },
      readyEvent: 'af-agents-catalog-ready',
      updatedEvent: 'af-agents-catalog-updated',
      icon: '🤖',
      title: 'Select agent',
      subtitle: 'Registered agents from the host application',
      placeholder: 'Search agents by name, role, or model…',
      emptyText: 'No agents match your search.',
      noneText: 'No agents found',
      idAttr: 'data-item-id',
    },
  };

  var _modal, _titleEl, _subtitleEl, _listEl, _searchEl, _pageInfo, _prevBtn, _nextBtn, _emptyEl;
  var _kind = null;
  var _cfg = null;
  var _nodeId = null;
  var _query = '';
  var _page = 1;
  var _onSelect = null;
  var _boundEvents = false;

  function esc(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function rowMeta(item) {
    if (_kind === 'tool') return esc(item.pluginName) + ' · ' + esc(item.name);
    if (_kind === 'skill') return esc(item.category) + ' · v' + esc(item.version) + ' · ' + esc(item.name);
    return esc(item.role) + ' · ' + esc(item.model) + ' · ' + esc(item.name);
  }

  function renderList() {
    if (!_listEl || !_cfg) return;
    var catalog = _cfg.catalog();
    if (!catalog) return;

    var filtered = catalog.search(_query);
    var pg = catalog.page(filtered, _page);
    if (_page > pg.totalPages) {
      _page = pg.totalPages;
      pg = catalog.page(filtered, _page);
    }

    _listEl.innerHTML = pg.items.map(function (item) {
      return '<button type="button" class="tool-picker-row" data-item-id="' + esc(item.id) + '">'
        + '<span class="tool-picker-row-icon">' + _cfg.icon + '</span>'
        + '<span class="tool-picker-row-body">'
        + '<span class="tool-picker-row-title">' + esc(item.displayName) + '</span>'
        + '<span class="tool-picker-row-meta">' + rowMeta(item) + '</span>'
        + '<span class="tool-picker-row-desc">' + esc(item.description) + '</span>'
        + '</span>'
        + '</button>';
    }).join('');

    if (_emptyEl) _emptyEl.classList.toggle('hidden', pg.items.length > 0);
    if (_pageInfo) {
      _pageInfo.textContent = pg.total
        ? 'Showing ' + ((pg.page - 1) * pg.pageSize + 1) + '–' + Math.min(pg.page * pg.pageSize, pg.total) + ' of ' + pg.total
        : _cfg.noneText;
    }
    if (_prevBtn) _prevBtn.disabled = pg.page <= 1;
    if (_nextBtn) _nextBtn.disabled = pg.page >= pg.totalPages;

    _listEl.querySelectorAll('.tool-picker-row').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = catalog.findById(btn.dataset.itemId);
        if (!item) return;
        if (_onSelect) _onSelect(item);
        if (_nodeId) {
          AF.store.updateNode(_nodeId, {
            label: item.displayName || item.name,
            props: catalog.propsFromItem(item),
          });
        }
        AF.entityPicker.close();
      });
    });
  }

  function bindCatalogEvents() {
    if (_boundEvents) return;
    _boundEvents = true;
    Object.keys(KINDS).forEach(function (kind) {
      var cfg = KINDS[kind];
      window.addEventListener(cfg.readyEvent, function () {
        if (_kind === kind) renderList();
      });
      window.addEventListener(cfg.updatedEvent, function () {
        if (_kind === kind) renderList();
      });
    });
  }

  AF.entityPicker = {
    init: function () {
      _modal = document.getElementById('entity-picker-modal');
      if (!_modal) return;

      _titleEl = document.getElementById('entity-picker-title');
      _subtitleEl = document.getElementById('entity-picker-subtitle');
      _listEl = document.getElementById('entity-picker-list');
      _searchEl = document.getElementById('entity-picker-search');
      _pageInfo = document.getElementById('entity-picker-page-info');
      _prevBtn = document.getElementById('entity-picker-prev');
      _nextBtn = document.getElementById('entity-picker-next');
      _emptyEl = document.getElementById('entity-picker-empty');

      document.getElementById('entity-picker-close').addEventListener('click', function () {
        AF.entityPicker.close();
      });
      _modal.addEventListener('click', function (e) {
        if (e.target === _modal) AF.entityPicker.close();
      });

      if (_searchEl) {
        _searchEl.addEventListener('input', function () {
          _query = _searchEl.value;
          _page = 1;
          renderList();
        });
      }
      if (_prevBtn) {
        _prevBtn.addEventListener('click', function () {
          if (_page > 1) { _page--; renderList(); }
        });
      }
      if (_nextBtn) {
        _nextBtn.addEventListener('click', function () {
          _page++;
          renderList();
        });
      }

      bindCatalogEvents();

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) {
          AF.entityPicker.close();
        }
      });
    },

    open: function (opts) {
      opts = opts || {};
      _kind = opts.kind || 'tool';
      _cfg = KINDS[_kind];
      if (!_cfg) return;

      _nodeId = opts.nodeId || null;
      _onSelect = opts.onSelect || null;
      _query = '';
      _page = 1;
      if (_searchEl) _searchEl.value = '';
      if (_titleEl) _titleEl.textContent = _cfg.title;
      if (_subtitleEl) _subtitleEl.textContent = _cfg.subtitle;
      if (_searchEl) _searchEl.placeholder = _cfg.placeholder;
      if (_emptyEl) _emptyEl.textContent = _cfg.emptyText;

      _cfg.catalog().whenReady(function () {
        if (_modal) _modal.classList.remove('hidden');
        renderList();
        if (_searchEl) _searchEl.focus();
      });

      if (AF.embed && AF.embed.isEmbed) _cfg.request();
    },

    close: function () {
      if (_modal) _modal.classList.add('hidden');
      _kind = null;
      _cfg = null;
      _nodeId = null;
      _onSelect = null;
    },
  };

  AF.toolPicker = {
    init: function () {},
    open: function (opts) { AF.entityPicker.open(Object.assign({ kind: 'tool' }, opts || {})); },
    close: function () { AF.entityPicker.close(); },
  };
})();
