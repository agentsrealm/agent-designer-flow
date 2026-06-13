/* js/tool-picker.js — modal tool selector for Tool Task nodes */
window.AF = window.AF || {};

(function () {
  var _modal, _listEl, _searchEl, _pageInfo, _prevBtn, _nextBtn, _emptyEl;
  var _nodeId = null;
  var _query = '';
  var _page = 1;
  var _onSelect = null;

  function esc(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderList() {
    if (!_listEl) return;
    var filtered = AF.toolsCatalog.search(_query);
    var pg = AF.toolsCatalog.page(filtered, _page);
    if (_page > pg.totalPages) {
      _page = pg.totalPages;
      pg = AF.toolsCatalog.page(filtered, _page);
    }

    _listEl.innerHTML = pg.items.map(function (tool) {
      return '<button type="button" class="tool-picker-row" data-tool-id="' + esc(tool.id) + '">'
        + '<span class="tool-picker-row-icon">🔧</span>'
        + '<span class="tool-picker-row-body">'
        + '<span class="tool-picker-row-title">' + esc(tool.displayName) + '</span>'
        + '<span class="tool-picker-row-meta">' + esc(tool.pluginName) + ' · ' + esc(tool.name) + '</span>'
        + '<span class="tool-picker-row-desc">' + esc(tool.description) + '</span>'
        + '</span>'
        + '</button>';
    }).join('');

    if (_emptyEl) _emptyEl.classList.toggle('hidden', pg.items.length > 0);
    if (_pageInfo) {
      _pageInfo.textContent = pg.total
        ? 'Showing ' + ((pg.page - 1) * pg.pageSize + 1) + '–' + Math.min(pg.page * pg.pageSize, pg.total) + ' of ' + pg.total
        : 'No tools found';
    }
    if (_prevBtn) _prevBtn.disabled = pg.page <= 1;
    if (_nextBtn) _nextBtn.disabled = pg.page >= pg.totalPages;

    _listEl.querySelectorAll('.tool-picker-row').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tool = AF.toolsCatalog.findById(btn.dataset.toolId);
        if (!tool) return;
        if (_onSelect) _onSelect(tool);
        if (_nodeId) {
          AF.store.updateNode(_nodeId, {
            label: tool.displayName || tool.name,
            props: AF.toolsCatalog.propsFromTool(tool),
          });
        }
        AF.toolPicker.close();
      });
    });
  }

  AF.toolPicker = {
    init: function () {
      _modal = document.getElementById('tool-picker-modal');
      if (!_modal) return;

      _listEl = document.getElementById('tool-picker-list');
      _searchEl = document.getElementById('tool-picker-search');
      _pageInfo = document.getElementById('tool-picker-page-info');
      _prevBtn = document.getElementById('tool-picker-prev');
      _nextBtn = document.getElementById('tool-picker-next');
      _emptyEl = document.getElementById('tool-picker-empty');

      document.getElementById('tool-picker-close').addEventListener('click', function () {
        AF.toolPicker.close();
      });
      _modal.addEventListener('click', function (e) {
        if (e.target === _modal) AF.toolPicker.close();
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

      window.addEventListener('af-tools-catalog-updated', function () { renderList(); });
      window.addEventListener('af-tools-catalog-ready', function () { renderList(); });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) {
          AF.toolPicker.close();
        }
      });
    },

    open: function (opts) {
      opts = opts || {};
      _nodeId = opts.nodeId || null;
      _onSelect = opts.onSelect || null;
      _query = '';
      _page = 1;
      if (_searchEl) _searchEl.value = '';

      AF.toolsCatalog.whenReady(function () {
        if (_modal) _modal.classList.remove('hidden');
        renderList();
        if (_searchEl) _searchEl.focus();
      });

      if (AF.embed && AF.embed.isEmbed) AF.toolsCatalog.requestFromHost();
    },

    close: function () {
      if (_modal) _modal.classList.add('hidden');
      _nodeId = null;
      _onSelect = null;
    },
  };
})();
