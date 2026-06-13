/* js/embed.js — iframe embed API for Angular host (postMessage) */
window.AF = window.AF || {};

(function () {
  var params = new URLSearchParams(window.location.search);
  var isEmbed = params.get('embed') === '1';

  function allowedOrigin() {
    try {
      return window.location.origin;
    } catch (e) {
      return '*';
    }
  }

  function postToParent(type, payload) {
    if (!isEmbed || window.parent === window) return;
    window.parent.postMessage({ type: type, payload: payload }, allowedOrigin());
  }

  function emptyFlow(name) {
    return {
      schema: 'agent-flow/v1',
      metadata: { name: name || 'Untitled Flow' },
      nodes: [],
      edges: [],
      runtime: { engine: 'agentcore' },
    };
  }

  function syncFlowNameFromUi() {
    var nameEl = document.getElementById('flow-name-label');
    if (nameEl) AF.store.setFlowName((nameEl.textContent || '').trim() || 'Untitled Flow');
  }

  function exportFlowJson() {
    syncFlowNameFromUi();
    return AF.store.exportJSON();
  }

  function closeFlowOptionsMenu() {
    var menu = document.getElementById('flow-options-menu');
    var btn = document.getElementById('btn-flow-options');
    if (menu) menu.setAttribute('hidden', '');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function wireEmbedDraftSave() {
    var saveDraft = document.getElementById('fom-save-draft');
    if (!saveDraft || !saveDraft.parentNode) return;
    var replacement = saveDraft.cloneNode(true);
    saveDraft.parentNode.replaceChild(replacement, saveDraft);
    replacement.addEventListener('click', function () {
      closeFlowOptionsMenu();
      postToParent('FLOW_DRAFT_SAVE', exportFlowJson());
    });
  }

  function applyEmbedChrome() {
    document.body.classList.add('af-embed');
    var hideIds = ['btn-new', 'btn-import', 'btn-test-run'];
    hideIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    var exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', syncFlowNameFromUi);

    var saveBtn = document.getElementById('btn-embed-save');
    var cancelBtn = document.getElementById('btn-embed-cancel');
    if (saveBtn) {
      saveBtn.style.display = 'inline-flex';
      saveBtn.addEventListener('click', function () {
        var errors = AF.renderValidation(AF.validateFlow());
        if (errors > 0) {
          document.getElementById('validation-panel').classList.remove('hidden');
          return;
        }
        postToParent('FLOW_SAVE', exportFlowJson());
      });
    }
    if (cancelBtn) {
      cancelBtn.style.display = 'inline-flex';
      cancelBtn.addEventListener('click', function () {
        postToParent('FLOW_CANCEL', null);
      });
    }
  }

  function scheduleFitView() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        AF.fitScreen && AF.fitScreen();
      });
    });
  }

  function hasSavedViewport(data) {
    var vp = data && data.viewport;
    return !!(vp && typeof vp === 'object'
      && typeof vp.zoom === 'number'
      && typeof vp.panX === 'number'
      && typeof vp.panY === 'number');
  }

  function loadFlow(data) {
    if (!data || typeof data !== 'object') {
      AF.store.importJSON(emptyFlow());
    } else {
      AF.store.importJSON(data);
    }
    var nameEl = document.getElementById('flow-name-label');
    if (nameEl) nameEl.textContent = AF.store.get('flowName');
    if (!hasSavedViewport(data)) {
      scheduleFitView();
    }
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) return;
    var msg = event.data;
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'FLOW_LOAD') {
      loadFlow(msg.payload);
    }
    if (msg.type === 'FLOW_TOOLS_CATALOG' && AF.toolsCatalog) {
      AF.toolsCatalog.setCatalog(msg.payload);
    }
    if (msg.type === 'FLOW_SKILLS_CATALOG' && AF.skillsCatalog) {
      AF.skillsCatalog.setCatalog(msg.payload);
    }
    if (msg.type === 'FLOW_AGENTS_CATALOG' && AF.agentsCatalog) {
      AF.agentsCatalog.setCatalog(msg.payload);
    }
    if (msg.type === 'FLOW_SUBFLOWS_CATALOG' && AF.subflowsCatalog) {
      AF.subflowsCatalog.setCatalog(msg.payload);
    }
  });

  AF.embed = {
    isEmbed: isEmbed,
    postToParent: postToParent,
    postReady: function () {
      postToParent('FLOW_READY', { schema: 'agent-flow/v1' });
    },
    loadFlow: loadFlow,
    emptyFlow: emptyFlow,
  };

  if (isEmbed) {
    applyEmbedChrome();
    window.addEventListener('load', wireEmbedDraftSave);
  }
})();
