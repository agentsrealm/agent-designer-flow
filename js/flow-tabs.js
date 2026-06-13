/* js/flow-tabs.js — multi-tab flow editor (root + subflow tabs) */
window.AF = window.AF || {};

(function () {
  var _tabs = [];
  var _activeId = 'root';
  var _snapshots = {};
  var _listEl = null;

  function esc(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function captureStore() {
    return JSON.parse(JSON.stringify(AF.store.exportJSON()));
  }

  function persistActiveTab() {
    _snapshots[_activeId] = captureStore();
  }

  function renderTabs() {
    if (!_listEl) return;
    _listEl.innerHTML = _tabs.map(function (tab) {
      var cls = 'flow-tab' + (tab.id === _activeId ? ' active' : '');
      var closeBtn = tab.closable
        ? '<button type="button" class="flow-tab-close" data-tab-close="' + esc(tab.id) + '" title="Close tab">✕</button>'
        : '';
      return '<button type="button" class="' + cls + '" data-tab-id="' + esc(tab.id) + '">'
        + '<span class="flow-tab-icon">' + (tab.icon || '⬡') + '</span>'
        + '<span class="flow-tab-label">' + esc(tab.label) + '</span>'
        + closeBtn
        + '</button>';
    }).join('');

    _listEl.querySelectorAll('[data-tab-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (e.target.closest('[data-tab-close]')) return;
        AF.flowTabs.switchTo(btn.dataset.tabId);
      });
    });
    _listEl.querySelectorAll('[data-tab-close]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        AF.flowTabs.closeTab(btn.dataset.tabClose);
      });
    });
  }

  function syncFlowNameLabel(name) {
    var el = document.getElementById('flow-name-label');
    if (el) el.textContent = name || 'Untitled Flow';
  }

  AF.flowTabs = {
    init: function () {
      _listEl = document.getElementById('flow-tabs-list');
      _tabs = [{ id: 'root', label: 'Main flow', icon: '⬡', closable: false }];
      _activeId = 'root';
      _snapshots = {};
      renderTabs();
    },

    registerRoot: function () {
      _snapshots.root = captureStore();
      var name = AF.store.get('flowName') || 'Main flow';
      _tabs[0].label = name;
      renderTabs();
    },

    switchTo: function (tabId) {
      if (!tabId || tabId === _activeId) return;
      if (!_tabs.some(function (t) { return t.id === tabId; })) return;

      persistActiveTab();
      _activeId = tabId;

      var flow = _snapshots[tabId];
      if (flow) {
        AF.store.replaceFlow(flow);
        syncFlowNameLabel(flow.metadata && flow.metadata.name);
      }
      renderTabs();
    },

    openSubflow: function (subflowId, label, flow) {
      if (!subflowId || !flow) return;
      var tabId = 'subflow:' + subflowId;
      var existing = _tabs.find(function (t) { return t.id === tabId; });

      if (!existing) {
        _tabs.push({
          id: tabId,
          label: label || subflowId,
          icon: '📦',
          closable: true,
          subflowId: subflowId,
        });
        _snapshots[tabId] = JSON.parse(JSON.stringify(flow));
      }

      persistActiveTab();
      _activeId = tabId;
      AF.store.replaceFlow(_snapshots[tabId]);
      syncFlowNameLabel(_snapshots[tabId].metadata && _snapshots[tabId].metadata.name);
      renderTabs();
    },

    openFromNode: function (node) {
      if (!node || node.type !== 'subflow') return;
      var id = node.props && (node.props.subflowId || node.props.flowId);
      if (!id) {
        window.alert('Select a subflow first using the properties panel.');
        return;
      }
      var item = AF.subflowsCatalog && AF.subflowsCatalog.findById(id);
      var flow = (item && item.flow) || (AF.subflowsCatalog && AF.subflowsCatalog.getFlow(id));
      if (!flow) {
        window.alert('Subflow definition not found for "' + id + '".');
        return;
      }
      AF.flowTabs.openSubflow(id, node.props.subflowDisplayName || node.label || item.displayName, flow);
    },

    closeTab: function (tabId) {
      if (!tabId || tabId === 'root') return;
      var idx = _tabs.findIndex(function (t) { return t.id === tabId; });
      if (idx === -1) return;

      delete _snapshots[tabId];
      _tabs.splice(idx, 1);

      if (_activeId === tabId) {
        _activeId = 'root';
        var flow = _snapshots.root;
        if (flow) {
          AF.store.replaceFlow(flow);
          syncFlowNameLabel(flow.metadata && flow.metadata.name);
        }
      }
      renderTabs();
    },

    getActiveTabId: function () { return _activeId; },
    isRootTab: function () { return _activeId === 'root'; },
  };
})();
