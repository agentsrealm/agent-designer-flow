/* js/ai-companion.js — 3-step AI Companion popover */
window.AF = window.AF || {};

(function () {
  var INTENTS = [
    { id: 'build_new', icon: '✨', label: 'Build a new flow', desc: 'Describe your goal and generate a draft flow' },
    { id: 'extend', icon: '➕', label: 'Extend this flow', desc: 'Add steps, branches, tools, or integrations' },
    { id: 'harden', icon: '🛡', label: 'Fix or harden', desc: 'Improve error handling, approvals, and edge cases' },
    { id: 'explain', icon: '💬', label: 'Explain my flow', desc: 'AI reads the canvas and narrates what it does' },
  ];

  var HINTS = [
    { label: 'Trigger', text: 'What starts the agent — user message, API/webhook, schedule, or event?' },
    { label: 'Goal & steps', text: 'What should happen, in what order, and who or what is involved?' },
    { label: 'Human-in-the-loop', text: 'Approvals, review gates, or escalation when confidence is low.' },
    { label: 'Failure path', text: 'Retries, fallbacks, and what to do when a step fails.' },
    { label: 'Output', text: 'How results are delivered — chat reply, ticket, database, notification, etc.' },
    { label: 'Tools & data', text: 'Gateways, MCP tools, APIs, or knowledge bases the agent should use.' },
    { label: 'Memory & context', text: 'Session history, user preferences, or facts to remember across turns.' },
    { label: 'Constraints', text: 'Policies, guardrails, latency limits, or actions that must never run.' },
  ];

  var state = {
    step: 1,
    intent: null,
    description: '',
    selectedToolKeys: {},
    toolSearch: '',
  };
  var popover, backdrop, bodyEl, footerEl, stepLabelEl, titleEl, headerEl;
  var drag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function syncFlowNameFromUi() {
    var nameEl = document.getElementById('flow-name-label');
    if (nameEl) AF.store.setFlowName((nameEl.textContent || '').trim() || 'Untitled Flow');
  }

  function exportFlowJson() {
    syncFlowNameFromUi();
    return AF.store.exportJSON();
  }

  function selectedIntent() {
    return INTENTS.find(function (i) { return i.id === state.intent; }) || null;
  }

  function flowStats() {
    var nodes = AF.store.get('nodes') || [];
    var edges = AF.store.get('edges') || [];
    return { nodes: nodes.length, edges: edges.length };
  }

  function setStep(step) {
    state.step = step;
    if (step === 3 && AF.agentCapabilities && AF.agentCapabilities.requestFromHost) {
      AF.agentCapabilities.requestFromHost();
      syncDefaultToolSelections();
    }
    render();
  }

  function capabilityToolKey(gatewayId, pluginId, toolName) {
    return String(gatewayId || '') + '::' + String(pluginId || '') + '::' + String(toolName || '');
  }

  function getCapabilityGateways() {
    if (!AF.agentCapabilities || !AF.agentCapabilities.getCatalog) return [];
    var catalog = AF.agentCapabilities.getCatalog();
    return catalog && catalog.gateways ? catalog.gateways : [];
  }

  function allCapabilityTools() {
    var tools = [];
    getCapabilityGateways().forEach(function (gw) {
      (gw.plugins || []).forEach(function (plugin) {
        (plugin.tools || []).forEach(function (tool) {
          tools.push({ gateway: gw, plugin: plugin, tool: tool });
        });
      });
    });
    return tools;
  }

  function syncDefaultToolSelections() {
    allCapabilityTools().forEach(function (entry) {
      var key = capabilityToolKey(entry.gateway._id, entry.plugin._id, entry.tool.name);
      if (state.selectedToolKeys[key] === undefined) {
        state.selectedToolKeys[key] = true;
      }
    });
  }

  function isCapabilityToolSelected(gatewayId, pluginId, toolName) {
    return !!state.selectedToolKeys[capabilityToolKey(gatewayId, pluginId, toolName)];
  }

  function countSelectedInList(entries) {
    return entries.filter(function (entry) {
      return isCapabilityToolSelected(entry.gateway._id, entry.plugin._id, entry.tool.name);
    }).length;
  }

  function toolEntryMatchesSearch(entry, query) {
    if (!query) return true;
    var q = query.trim().toLowerCase();
    if (!q) return true;
    var tool = entry.tool;
    var plugin = entry.plugin;
    var gw = entry.gateway;
    return (tool.name || '').toLowerCase().indexOf(q) !== -1
      || (tool.title || '').toLowerCase().indexOf(q) !== -1
      || (tool.description || '').toLowerCase().indexOf(q) !== -1
      || (plugin.plugin_name || '').toLowerCase().indexOf(q) !== -1
      || (plugin.plugin_id || '').toLowerCase().indexOf(q) !== -1
      || (gw.name || '').toLowerCase().indexOf(q) !== -1
      || (gw.gateway_id || '').toLowerCase().indexOf(q) !== -1;
  }

  function buildSelectedGatewaysPayload() {
    return getCapabilityGateways().map(function (gw) {
      return {
        _id: gw._id,
        gateway_id: gw.gateway_id,
        name: gw.name,
        plugins: (gw.plugins || []).map(function (plugin) {
          var selected = (plugin.tools || [])
            .filter(function (tool) {
              return isCapabilityToolSelected(gw._id, plugin._id, tool.name);
            })
            .map(function (tool) { return tool.name; });
          return {
            _id: plugin._id,
            plugin_id: plugin.plugin_id,
            plugin_name: plugin.plugin_name,
            tools: selected,
          };
        }).filter(function (plugin) { return plugin.tools.length > 0; }),
      };
    }).filter(function (gw) { return gw.plugins.length > 0; });
  }

  function renderStep1() {
    return ''
      + '<p class="ai-companion-lead">What do you want to do?</p>'
      + '<div class="ai-intent-grid">'
      + INTENTS.map(function (intent) {
        var active = state.intent === intent.id ? ' active' : '';
        return '<button type="button" class="ai-intent-card' + active + '" data-intent="' + intent.id + '">'
          + '<span class="ai-intent-icon">' + intent.icon + '</span>'
          + '<span class="ai-intent-label">' + esc(intent.label) + '</span>'
          + '<span class="ai-intent-desc">' + esc(intent.desc) + '</span>'
          + '</button>';
      }).join('')
      + '</div>';
  }

  function renderStep2() {
    var intent = selectedIntent();
    var isExplain = state.intent === 'explain';
    var placeholder = isExplain
      ? 'Optional — what should the explanation focus on? Leave blank for a full walkthrough.'
      : 'Describe what this agent should do. Write freely — use the ideas on the right for inspiration.';
    var hintsHtml = HINTS.map(function (hint) {
      return '<li><span class="ai-hint-topic">' + esc(hint.label) + '</span> — ' + esc(hint.text) + '</li>';
    }).join('');
    return ''
      + '<div class="ai-step2-layout">'
      + '<div class="ai-step2-main">'
      + '<p class="ai-companion-lead">' + (isExplain ? 'Any focus areas?' : 'Tell the AI what to build') + '</p>'
      + (intent ? '<p class="ai-companion-sub">' + esc(intent.label) + '</p>' : '')
      + '<textarea id="ai-companion-description" class="ai-companion-textarea" rows="8" placeholder="' + esc(placeholder) + '"></textarea>'
      + '</div>'
      + '<div class="ai-hints-readonly" aria-readonly="true">'
      + '<div class="ai-hints-readonly-title">Ideas to consider</div>'
      + '<ul class="ai-hints-readonly-list">' + hintsHtml + '</ul>'
      + '</div>'
      + '</div>';
  }

  function renderStep3() {
    syncDefaultToolSelections();
    var gateways = getCapabilityGateways();
    var ready = AF.agentCapabilities && AF.agentCapabilities.isReady && AF.agentCapabilities.isReady();
    var catalog = AF.agentCapabilities && AF.agentCapabilities.getCatalog ? AF.agentCapabilities.getCatalog() : null;
    var catalogSource = catalog && catalog.source ? catalog.source : 'none';
    var allEntries = allCapabilityTools();
    var query = state.toolSearch || '';

    if (!ready || (catalogSource === 'none' && !gateways.length)) {
      return ''
        + '<p class="ai-companion-lead">Gateway integrations</p>'
        + '<div class="ai-tools-loading">'
        + '<span class="ai-tools-spinner">⟳</span>'
        + '<span>Loading gateways, plugins, and tools for this agent...</span>'
        + '</div>';
    }

    if (!gateways.length) {
      return ''
        + '<p class="ai-companion-lead">Gateway integrations</p>'
        + '<p class="ai-companion-sub">Add gateways and choose plugin tools for this agent</p>'
        + '<div class="ai-cap-empty">'
        + '<span class="ai-cap-empty-icon">⬡</span>'
        + '<p>No gateways connected to this agent</p>'
        + '<p class="ai-companion-note">Configure gateways in agent settings, then reopen AI Companion.</p>'
        + '</div>';
    }

    var enabled = countSelectedInList(allEntries);
    var gatewaysHtml = gateways.map(function (gw) {
      var gwEntries = [];
      (gw.plugins || []).forEach(function (plugin) {
        (plugin.tools || []).forEach(function (tool) {
          gwEntries.push({ gateway: gw, plugin: plugin, tool: tool });
        });
      });
      var gwFiltered = gwEntries.filter(function (entry) { return toolEntryMatchesSearch(entry, query); });
      if (query && !gwFiltered.length) return '';

      var gwSelected = countSelectedInList(gwEntries);
      var pluginsHtml = (gw.plugins || []).map(function (plugin) {
        var pluginEntries = (plugin.tools || []).map(function (tool) {
          return { gateway: gw, plugin: plugin, tool: tool };
        });
        var pluginFiltered = pluginEntries.filter(function (entry) { return toolEntryMatchesSearch(entry, query); });
        if (query && !pluginFiltered.length) return '';

        var pluginSelected = countSelectedInList(pluginEntries);
        var toolsHtml = pluginFiltered.map(function (entry) {
          var tool = entry.tool;
          var key = capabilityToolKey(gw._id, plugin._id, tool.name);
          var checked = isCapabilityToolSelected(gw._id, plugin._id, tool.name) ? ' checked' : '';
          return ''
            + '<label class="ai-tool-row">'
            + '<input type="checkbox" class="ai-tool-checkbox" data-cap-key="' + esc(key) + '"' + checked + ' />'
            + '<span class="ai-tool-info">'
            + '<span class="ai-tool-title">' + esc(tool.title || tool.name) + '</span>'
            + '<span class="ai-tool-name">' + esc(tool.name) + '</span>'
            + (tool.description ? '<span class="ai-tool-desc">' + esc(tool.description) + '</span>' : '')
            + '</span>'
            + '</label>';
        }).join('');

        return ''
          + '<div class="ai-tools-plugin" data-plugin-id="' + esc(plugin._id) + '">'
          + '<div class="ai-tools-plugin-head">'
          + '<div>'
          + '<div class="ai-tools-plugin-name">' + esc(plugin.plugin_name || plugin.plugin_id) + '</div>'
          + '<div class="ai-tools-plugin-id">' + esc(plugin.plugin_id) + '</div>'
          + '</div>'
          + '<div class="ai-tools-plugin-actions">'
          + (plugin.loadError ? '<span class="ai-cap-error">' + esc(plugin.loadError) + '</span>' : '')
          + '<span class="ai-tools-plugin-count">' + pluginSelected + '/' + pluginEntries.length + '</span>'
          + '<button type="button" class="ai-tools-toggle" data-gw-id="' + esc(gw._id) + '" data-plugin-id="' + esc(plugin._id) + '" data-enable="1">All</button>'
          + '<button type="button" class="ai-tools-toggle" data-gw-id="' + esc(gw._id) + '" data-plugin-id="' + esc(plugin._id) + '" data-enable="0">None</button>'
          + '</div>'
          + '</div>'
          + (toolsHtml
            ? '<div class="ai-tools-list">' + toolsHtml + '</div>'
            : '<div class="ai-cap-plugin-empty">No tools returned for this plugin</div>')
          + '</div>';
      }).join('');

      return ''
        + '<div class="ai-cap-gateway" data-gw-id="' + esc(gw._id) + '">'
        + '<div class="ai-cap-gateway-head">'
        + '<span class="ai-cap-gateway-icon">⬡</span>'
        + '<div class="ai-cap-gateway-meta">'
        + '<div class="ai-cap-gateway-name">' + esc(gw.name) + '</div>'
        + '<div class="ai-cap-gateway-id">' + esc(gw.gateway_id) + '</div>'
        + '</div>'
        + '<div class="ai-cap-gateway-actions">'
        + (gw.loadError ? '<span class="ai-cap-error">' + esc(gw.loadError) + '</span>' : '')
        + '<span class="ai-tools-plugin-count">' + gwSelected + '/' + gwEntries.length + '</span>'
        + '<button type="button" class="ai-tools-toggle" data-gw-id="' + esc(gw._id) + '" data-scope="gateway" data-enable="1">All</button>'
        + '<button type="button" class="ai-tools-toggle" data-gw-id="' + esc(gw._id) + '" data-scope="gateway" data-enable="0">None</button>'
        + '</div>'
        + '</div>'
        + '<div class="ai-cap-gateway-body">' + (pluginsHtml || '<div class="ai-cap-plugin-empty">No plugins on this gateway</div>') + '</div>'
        + '</div>';
    }).join('');

    return ''
      + '<div class="ai-cap-header">'
      + '<div>'
      + '<p class="ai-companion-lead">Gateway integrations</p>'
      + '<p class="ai-companion-sub">All tools are enabled by default — uncheck any you want to exclude</p>'
      + '</div>'
      + '<div class="ai-tools-global-actions">'
      + '<span class="ai-tools-global-count">' + enabled + ' of ' + allEntries.length + ' enabled</span>'
      + '<button type="button" class="ai-tools-toggle" data-scope="all" data-enable="1">Enable all</button>'
      + '<button type="button" class="ai-tools-toggle" data-scope="all" data-enable="0">Disable all</button>'
      + '</div>'
      + '</div>'
      + '<input type="search" id="ai-companion-tool-search" class="ai-tools-search" placeholder="Filter tools..." value="' + esc(query) + '" />'
      + '<div class="ai-cap-catalog">' + (gatewaysHtml || '<div class="ai-cap-plugin-empty">No tools match your filter</div>') + '</div>';
  }

  function bindStepEvents() {
    bodyEl.querySelectorAll('[data-intent]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.intent = btn.getAttribute('data-intent');
        render();
      });
    });

    var ta = document.getElementById('ai-companion-description');
    if (ta) {
      ta.value = state.description;
      ta.addEventListener('input', function () { state.description = ta.value; });
      ta.focus();
    }

    if (state.step === 3) {
      bindStep3Events();
    }
  }

  function setToolsForGateway(gatewayId, enable) {
    allCapabilityTools().forEach(function (entry) {
      if (entry.gateway._id === gatewayId) {
        state.selectedToolKeys[capabilityToolKey(entry.gateway._id, entry.plugin._id, entry.tool.name)] = enable;
      }
    });
  }

  function setToolsForPlugin(gatewayId, pluginId, enable) {
    allCapabilityTools().forEach(function (entry) {
      if (entry.gateway._id === gatewayId && entry.plugin._id === pluginId) {
        state.selectedToolKeys[capabilityToolKey(entry.gateway._id, entry.plugin._id, entry.tool.name)] = enable;
      }
    });
  }

  function setAllTools(enable) {
    allCapabilityTools().forEach(function (entry) {
      state.selectedToolKeys[capabilityToolKey(entry.gateway._id, entry.plugin._id, entry.tool.name)] = enable;
    });
  }

  function bindStep3Events() {
    var search = document.getElementById('ai-companion-tool-search');
    if (search) {
      search.addEventListener('input', function () {
        state.toolSearch = search.value;
        bodyEl.innerHTML = renderStep3();
        bindStepEvents();
      });
    }

    bodyEl.querySelectorAll('.ai-tool-checkbox').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var key = cb.getAttribute('data-cap-key');
        if (key) state.selectedToolKeys[key] = cb.checked;
        updateStep3Counts();
      });
    });

    bodyEl.querySelectorAll('.ai-tools-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var enable = btn.getAttribute('data-enable') === '1';
        var scope = btn.getAttribute('data-scope');
        if (scope === 'all') {
          setAllTools(enable);
        } else if (scope === 'gateway') {
          setToolsForGateway(btn.getAttribute('data-gw-id') || '', enable);
        } else {
          setToolsForPlugin(btn.getAttribute('data-gw-id') || '', btn.getAttribute('data-plugin-id') || '', enable);
        }
        bodyEl.innerHTML = renderStep3();
        bindStepEvents();
      });
    });

    if (AF.agentCapabilities && AF.agentCapabilities.whenReady && !AF.agentCapabilities.isReady()) {
      AF.agentCapabilities.whenReady(function () {
        if (state.step === 3) {
          syncDefaultToolSelections();
          bodyEl.innerHTML = renderStep3();
          bindStepEvents();
        }
      });
    }
  }

  function onCapabilitiesCatalogUpdated() {
    if (state.step !== 3 || !bodyEl) return;
    syncDefaultToolSelections();
    bodyEl.innerHTML = renderStep3();
    bindStepEvents();
  }

  function updateStep3Counts() {
    var allEntries = allCapabilityTools();
    var globalCount = bodyEl && bodyEl.querySelector('.ai-tools-global-count');
    if (globalCount) {
      globalCount.textContent = countSelectedInList(allEntries) + ' of ' + allEntries.length + ' enabled';
    }
    bodyEl.querySelectorAll('.ai-cap-gateway').forEach(function (gwEl) {
      var gwId = gwEl.getAttribute('data-gw-id');
      var gwEntries = allEntries.filter(function (e) { return e.gateway._id === gwId; });
      var gwCount = gwEl.querySelector('.ai-cap-gateway-actions .ai-tools-plugin-count');
      if (gwCount) gwCount.textContent = countSelectedInList(gwEntries) + '/' + gwEntries.length;
      gwEl.querySelectorAll('.ai-tools-plugin').forEach(function (pluginEl) {
        var pluginId = pluginEl.getAttribute('data-plugin-id');
        var pluginEntries = gwEntries.filter(function (e) { return e.plugin._id === pluginId; });
        var countEl = pluginEl.querySelector('.ai-tools-plugin-count');
        if (countEl) countEl.textContent = countSelectedInList(pluginEntries) + '/' + pluginEntries.length;
      });
    });
  }

  function renderFooter() {
    var back = state.step > 1
      ? '<button type="button" class="btn-outline" id="ai-companion-back">Back</button>'
      : '<button type="button" class="btn-outline" id="ai-companion-cancel">Cancel</button>';
    var next = '';
    if (state.step === 1) {
      next = '<button type="button" class="btn-primary" id="ai-companion-next"' + (state.intent ? '' : ' disabled') + '>Continue</button>';
    } else if (state.step === 2) {
      next = '<button type="button" class="btn-primary" id="ai-companion-next">Continue</button>';
    } else {
      next = '<button type="button" class="btn-primary ai-generate-btn" id="ai-companion-generate">✦ Generate</button>';
    }
    footerEl.innerHTML = back + next;

    var cancelBtn = document.getElementById('ai-companion-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { AF.aiCompanion.close(); });
    var backBtn = document.getElementById('ai-companion-back');
    if (backBtn) backBtn.addEventListener('click', function () { setStep(state.step - 1); });
    var nextBtn = document.getElementById('ai-companion-next');
    if (nextBtn) nextBtn.addEventListener('click', function () { setStep(state.step + 1); });
    var genBtn = document.getElementById('ai-companion-generate');
    if (genBtn) genBtn.addEventListener('click', function () { AF.aiCompanion.generate(); });
  }

  function render() {
    if (!bodyEl) return;
    stepLabelEl.textContent = 'Step ' + state.step + ' of 3';
    if (state.step === 1) titleEl.textContent = 'Choose intent';
    if (state.step === 2) titleEl.textContent = 'Describe your agent';
    if (state.step === 3) titleEl.textContent = 'Gateway integrations';

    if (state.step === 1) bodyEl.innerHTML = renderStep1();
    if (state.step === 2) bodyEl.innerHTML = renderStep2();
    if (state.step === 3) bodyEl.innerHTML = renderStep3();
    bindStepEvents();
    renderFooter();
  }

  function reset() {
    state = {
      step: 1,
      intent: null,
      description: '',
      selectedToolKeys: {},
      toolSearch: '',
    };
    render();
  }

  function centerPopover() {
    if (!popover) return;
    popover.style.left = '50%';
    popover.style.top = '50%';
    popover.style.right = 'auto';
    popover.style.transform = 'translate(-50%, -50%)';
  }

  function clampPopoverPosition(left, top) {
    var w = popover.offsetWidth;
    var h = popover.offsetHeight;
    var maxL = Math.max(8, window.innerWidth - w - 8);
    var maxT = Math.max(8, window.innerHeight - h - 8);
    return {
      left: Math.max(8, Math.min(left, maxL)),
      top: Math.max(8, Math.min(top, maxT)),
    };
  }

  function onDragMove(clientX, clientY) {
    if (!drag.active || !popover) return;
    var pos = clampPopoverPosition(
      drag.startLeft + (clientX - drag.startX),
      drag.startTop + (clientY - drag.startY)
    );
    popover.style.left = pos.left + 'px';
    popover.style.top = pos.top + 'px';
  }

  function endDrag() {
    if (!drag.active) return;
    drag.active = false;
    if (popover) popover.classList.remove('is-dragging');
  }

  function bindDrag() {
    if (!headerEl || !popover) return;

    headerEl.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || e.target.closest('#ai-companion-close')) return;
      e.preventDefault();
      var rect = popover.getBoundingClientRect();
      popover.style.transform = 'none';
      popover.style.left = rect.left + 'px';
      popover.style.top = rect.top + 'px';
      popover.style.right = 'auto';
      drag.active = true;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.startLeft = rect.left;
      drag.startTop = rect.top;
      popover.classList.add('is-dragging');
    });

    headerEl.addEventListener('touchstart', function (e) {
      if (e.target.closest('#ai-companion-close')) return;
      var touch = e.touches[0];
      if (!touch) return;
      var rect = popover.getBoundingClientRect();
      popover.style.transform = 'none';
      popover.style.left = rect.left + 'px';
      popover.style.top = rect.top + 'px';
      popover.style.right = 'auto';
      drag.active = true;
      drag.startX = touch.clientX;
      drag.startY = touch.clientY;
      drag.startLeft = rect.left;
      drag.startTop = rect.top;
      popover.classList.add('is-dragging');
    }, { passive: true });

    window.addEventListener('mousemove', function (e) {
      if (!drag.active) return;
      e.preventDefault();
      onDragMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', endDrag);

    window.addEventListener('touchmove', function (e) {
      if (!drag.active) return;
      var touch = e.touches[0];
      if (!touch) return;
      onDragMove(touch.clientX, touch.clientY);
    }, { passive: true });

    window.addEventListener('touchend', endDrag);
    window.addEventListener('touchcancel', endDrag);
  }

  AF.aiCompanion = {
    init: function () {
      popover = document.getElementById('ai-companion-popover');
      backdrop = document.getElementById('ai-companion-backdrop');
      bodyEl = document.getElementById('ai-companion-body');
      footerEl = document.getElementById('ai-companion-footer');
      stepLabelEl = document.getElementById('ai-companion-step');
      titleEl = document.getElementById('ai-companion-title');
      headerEl = popover ? popover.querySelector('.ai-companion-header') : null;
      var btn = document.getElementById('btn-ai-companion');
      var closeBtn = document.getElementById('ai-companion-close');

      if (!popover || !btn) return;

      bindDrag();

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        AF.aiCompanion.toggle();
      });
      if (closeBtn) closeBtn.addEventListener('click', function () { AF.aiCompanion.close(); });
      if (backdrop) backdrop.addEventListener('click', function () { AF.aiCompanion.close(); });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && popover && !popover.classList.contains('hidden')) {
          AF.aiCompanion.close();
        }
      });

      window.addEventListener('af-agent-capabilities-updated', onCapabilitiesCatalogUpdated);
    },

    open: function () {
      if (!popover) return;
      reset();
      centerPopover();
      popover.classList.remove('hidden');
      if (backdrop) backdrop.classList.remove('hidden');
      var btn = document.getElementById('btn-ai-companion');
      if (btn) btn.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(centerPopover);
    },

    close: function () {
      if (!popover) return;
      endDrag();
      popover.classList.add('hidden');
      if (backdrop) backdrop.classList.add('hidden');
      var btn = document.getElementById('btn-ai-companion');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    },

    toggle: function () {
      if (!popover) return;
      if (popover.classList.contains('hidden')) AF.aiCompanion.open();
      else AF.aiCompanion.close();
    },

    generate: function () {
      var intent = selectedIntent();
      var payload = {
        intent: state.intent,
        intent_label: intent ? intent.label : '',
        description: (state.description || '').trim(),
        flow_name: AF.store.get('flowName') || 'Untitled Flow',
        flow_json: exportFlowJson(),
        canvas_stats: flowStats(),
        gateways: buildSelectedGatewaysPayload(),
        tools_enabled_count: countSelectedInList(allCapabilityTools()),
        tools_total_count: allCapabilityTools().length,
      };

      if (AF.embed && AF.embed.postToParent) {
        AF.embed.postToParent('FLOW_AI_COMPANION_GENERATE', payload);
      } else {
        console.log('[AI Companion] generate', payload);
      }
      AF.aiCompanion.close();
    },
  };
})();
