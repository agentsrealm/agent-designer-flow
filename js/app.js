/* js/app.js — root: wires everything, topbar, context menu, import/export, starter flow */
window.AF = window.AF || {};

(function () {
  /* ── Boot ── */
  AF.initPalette();
  AF.initCanvas();
  AF.initProperties();
  AF.toolsCatalog.init();
  AF.mockToolsCatalog.init();
  AF.skillsCatalog.init();
  AF.agentsCatalog.init();
  AF.subflowsCatalog.init();
  AF.flowTabs.init();
  AF.entityPicker.init();
  bindTopbar();
  bindContextMenu();
  if (!AF.embed || !AF.embed.isEmbed) loadStarterFlow();
  if (AF.embed && AF.embed.isEmbed) AF.embed.postReady();

  /* ── Topbar ── */
  function bindTopbar() {
    document.getElementById('btn-undo').addEventListener('click', function(){ AF.store.undo(); });
    document.getElementById('btn-redo').addEventListener('click', function(){ AF.store.redo(); });
    document.getElementById('btn-zoom-in').addEventListener('click', AF.zoomIn);
    document.getElementById('btn-zoom-out').addEventListener('click', AF.zoomOut);
    document.getElementById('btn-fit').addEventListener('click', AF.fitScreen);
    document.getElementById('btn-auto-layout').addEventListener('click', AF.autoLayout);

    var panBtn = document.getElementById('btn-pan-mode');
    panBtn.addEventListener('click', function () {
      var on = !AF.isPanMode();
      AF.setPanMode(on);
      panBtn.classList.toggle('active', on);
      panBtn.title = on ? 'Pan Mode ON — click to disable' : 'Pan Mode (drag canvas)';
    });

    var nameEl = document.getElementById('flow-name-label');
    nameEl.addEventListener('input', function () { AF.store.setFlowName(nameEl.textContent.trim()); });
    AF.store.on('import', function () { nameEl.textContent = AF.store.get('flowName'); });

    var themeBtn   = document.getElementById('btn-theme');
    var isLight    = localStorage.getItem('af-theme') === 'light';
    function applyTheme(light) {
      isLight = light;
      document.body.classList.toggle('theme-light', light);
      themeBtn.textContent = light ? '🌙' : '☀';
      themeBtn.title       = light ? 'Switch to Dark theme' : 'Switch to Light theme';
      localStorage.setItem('af-theme', light ? 'light' : 'dark');
    }
    applyTheme(isLight);
    themeBtn.addEventListener('click', function () {
      applyTheme(!isLight);
      // repaint grid with new palette
      AF.store.setZoom(AF.store.get('zoom'));
    });

    var flowOptBtn  = document.getElementById('btn-flow-options');
    var flowOptMenu = document.getElementById('flow-options-menu');
    flowOptBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = flowOptMenu.hasAttribute('hidden');
      flowOptMenu.toggleAttribute('hidden', !open);
      flowOptBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function () {
      if (!flowOptMenu.hasAttribute('hidden')) {
        flowOptMenu.setAttribute('hidden', '');
        flowOptBtn.setAttribute('aria-expanded', 'false');
      }
    });
    flowOptMenu.addEventListener('click', function (e) { e.stopPropagation(); });

    function closeFlowMenu() {
      flowOptMenu.setAttribute('hidden', '');
      flowOptBtn.setAttribute('aria-expanded', 'false');
    }

    document.getElementById('fom-save-draft').addEventListener('click', function () {
      closeFlowMenu();
      var name = AF.store.get('flowName') || 'Untitled Flow';
      var drafts = JSON.parse(localStorage.getItem('af-drafts') || '{}');
      drafts[name] = AF.store.exportJSON();
      localStorage.setItem('af-drafts', JSON.stringify(drafts));
      alert('Draft saved: ' + name);
    });

    document.getElementById('fom-delete-draft').addEventListener('click', function () {
      closeFlowMenu();
      var name = AF.store.get('flowName') || 'Untitled Flow';
      var drafts = JSON.parse(localStorage.getItem('af-drafts') || '{}');
      if (!drafts[name]) { alert('No draft found for: ' + name); return; }
      if (!confirm('Delete draft "' + name + '"?')) return;
      delete drafts[name];
      localStorage.setItem('af-drafts', JSON.stringify(drafts));
      alert('Draft deleted: ' + name);
    });

    document.getElementById('fom-publish').addEventListener('click', function () {
      closeFlowMenu();
      var name = AF.store.get('flowName') || 'Untitled Flow';
      var published = JSON.parse(localStorage.getItem('af-published') || '{}');
      published[name] = AF.store.exportJSON();
      localStorage.setItem('af-published', JSON.stringify(published));
      alert('Published: ' + name);
    });

    document.getElementById('fom-unpublish').addEventListener('click', function () {
      closeFlowMenu();
      var name = AF.store.get('flowName') || 'Untitled Flow';
      var published = JSON.parse(localStorage.getItem('af-published') || '{}');
      if (!published[name]) { alert('No published version found for: ' + name); return; }
      if (!confirm('Unpublish "' + name + '"?')) return;
      delete published[name];
      localStorage.setItem('af-published', JSON.stringify(published));
      alert('Unpublished: ' + name);
    });

    document.getElementById('fom-clear-all').addEventListener('click', function () {
      closeFlowMenu();
      if (!confirm('Clear all nodes and edges from the canvas?')) return;
      AF.store.importJSON({
        schema: 'agent-flow/v1',
        metadata: { name: AF.store.get('flowName') || 'Untitled Flow' },
        nodes: [], edges: [], runtime: { engine: 'agentcore' },
      });
    });
  }

  /* ── Simulate test run ── */
  function simulateRun() {
    var errors = AF.renderValidation(AF.validateFlow());
    if (errors > 0) { document.getElementById('validation-panel').classList.remove('hidden'); return; }

    var trace = document.getElementById('testrun-trace');
    var nodes = AF.store.get('nodes');
    var edges = AF.store.get('edges');
    trace.textContent = '';
    var delay = 0;

    function log(msg) {
      delay += 380;
      setTimeout(function () { trace.textContent += msg + '\n'; trace.scrollTop = trace.scrollHeight; }, delay);
    }

    log('▶ Starting flow simulation...');
    log('  Flow: "' + AF.store.get('flowName') + '"');
    log('  Nodes: ' + nodes.length + '   Edges: ' + edges.length);
    log('');

    var startNode = nodes.find(function(n){return n.type==='start';});
    if (!startNode) { log('✗ No Start node found.'); return; }

    var visited = new Set(), queue = [startNode.id];
    while (queue.length) {
      var id   = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      var node = AF.store.getNode(id);
      if (!node) continue;
      log('  ➜ [' + node.type.toUpperCase() + '] ' + node.label);
      edges.filter(function(e){return e.source===id;}).forEach(function(e){queue.push(e.target);});
    }
    log('');
    log('✓ Simulation complete.');
  }

  /* ── Context menu ── */
  function bindContextMenu() {
    var menu     = document.getElementById('context-menu');
    var menuList = document.getElementById('context-menu-list');

    window.addEventListener('show-context-menu', function (e) {
      var cx = e.detail.cx, cy = e.detail.cy, type = e.detail.type, id = e.detail.id;
      menuList.innerHTML = '';

      if (type === 'node') {
        var node = AF.store.getNode(id);
        if (node && node.type === 'subflow' && AF.flowTabs) {
          addItem('📦  Open Subflow', function () { AF.flowTabs.openFromNode(node); });
          addSep();
        }
        addItem('✏️  Rename',    function(){ renameNode(id); });
        addItem('📋  Duplicate', function(){ duplicateNode(id); });
        addSep();
        addItem('🗑  Delete Node', function(){ AF.store.deleteNode(id); }, 'danger');
      } else if (type === 'edge') {
        addItem('✏️  Edit Label', function(){
          var edge  = AF.store.getEdge(id);
          var label = prompt('Edge label:', edge ? edge.label || '' : '');
          if (label !== null) AF.store.updateEdge(id, { label: label });
        });
        addSep();
        addItem('🗑  Delete Connection', function(){ AF.store.deleteEdge(id); }, 'danger');
      }

      menu.style.left = cx + 'px';
      menu.style.top  = cy + 'px';
      menu.classList.remove('hidden');
    });

    document.addEventListener('click',       function(){ menu.classList.add('hidden'); });
    document.addEventListener('contextmenu', function(){ menu.classList.add('hidden'); });

    function addItem(label, action, cls) {
      var li = document.createElement('li');
      li.textContent = label;
      if (cls) li.classList.add(cls);
      li.addEventListener('click', function(){ action(); menu.classList.add('hidden'); });
      menuList.appendChild(li);
    }
    function addSep() {
      var li = document.createElement('li'); li.className = 'separator'; menuList.appendChild(li);
    }
  }

  function renameNode(id) {
    var node = AF.store.getNode(id); if (!node) return;
    var name = prompt('Node name:', node.label);
    if (name) AF.store.updateNode(id, { label: name });
  }
  function duplicateNode(id) {
    var node  = AF.store.getNode(id); if (!node) return;
    var newId = AF.store.nextId();
    var copy  = JSON.parse(JSON.stringify(node));
    copy.id   = newId; copy.x = node.x + 40; copy.y = node.y + 40; copy.label = node.label + ' (copy)';
    AF.store.addNode(copy);
    AF.store.select(newId, 'node');
  }

  /* ── Starter demo flow — work items (Agent, Skill, Tool Task) ── */
  function loadStarterFlow() {
    AF.store.importJSON({
      schema: 'agent-flow/v1',
      metadata: { name: 'Work Items Demo' },
      nodes: [
        {
          id: 'node_1', type: 'start', category: 'start', label: 'Start', icon: '▶',
          x: 60, y: 200,
          props: { name: 'Start', trigger: 'chat', userContext: true, tenantContext: false },
        },
        {
          id: 'node_2', type: 'agent', category: 'work', label: 'Support Agent', icon: '🤖',
          x: 280, y: 200,
          props: {
            name: 'Support Agent',
            agentRefId: 'agent_support',
            agentRefName: 'support-agent',
            agentDisplayName: 'Support Agent',
            agentDescription: 'Resolves technical issues using docs and tickets.',
            role: 'Technical Support',
            model: 'claude-sonnet-4-6',
            agentType: 'specialist',
            instructions: '', temperature: 0.7, maxTokens: 4096, maxIterations: 10, timeout: 120,
            tools: [], knowledgeBases: [], memoryScope: 'session', fallbackAgent: '',
          },
        },
        {
          id: 'node_3', type: 'skill', category: 'work', label: 'Classify Intent', icon: '♻',
          x: 500, y: 200,
          props: {
            name: 'Classify Intent',
            skillId: 'classify_intent',
            skillName: 'classify_intent',
            skillDisplayName: 'Classify Intent',
            skillDescription: 'Route user messages to the correct workflow intent.',
            version: '2.1',
            category: 'routing',
            parameters: '', inputVars: [], outputVars: [], outputKey: 'result',
          },
        },
        {
          id: 'node_4', type: 'tool-task', category: 'work', label: 'Search Jira Issues', icon: '🔧',
          x: 720, y: 200,
          props: {
            name: 'Search Jira Issues',
            toolId: 'jira_search_issues',
            toolName: 'jira_search_issues',
            toolDisplayName: 'Search Jira Issues',
            toolDescription: 'Run JQL queries and return matching issues.',
            pluginId: 'atlassian-mcp-plugin',
            pluginName: 'Atlassian MCP',
            endpoint: '', auth: 'oauth2',
          },
        },
        {
          id: 'node_5', type: 'subflow', category: 'work', label: 'Ticket Triage', icon: '📦',
          x: 960, y: 200,
          props: {
            name: 'Ticket Triage',
            subflowId: 'sf_ticket_triage',
            subflowName: 'ticket_triage',
            subflowDisplayName: 'Ticket Triage',
            subflowDescription: 'Classify incoming tickets and route to the correct queue.',
            flowId: 'sf_ticket_triage',
            flowRef: 'ticket_triage',
            version: '1.0',
            inputMapping: '', outputMapping: '', async: false, outputKey: 'result',
          },
        },
        {
          id: 'node_6', type: 'end', category: 'end', label: 'End', icon: '⏹',
          x: 1180, y: 200,
          props: { name: 'End', outputSchema: '', returnFormat: 'json' },
        },
      ],
      edges: [
        { id: 'edge_1', source: 'node_1', target: 'node_2', type: 'control', label: '' },
        { id: 'edge_2', source: 'node_2', target: 'node_3', type: 'control', label: '' },
        { id: 'edge_3', source: 'node_3', target: 'node_4', type: 'control', label: '' },
        { id: 'edge_4', source: 'node_4', target: 'node_5', type: 'control', label: '' },
        { id: 'edge_5', source: 'node_5', target: 'node_6', type: 'control', label: '' },
      ],
      runtime: { engine: 'agentcore' },
    });
    document.getElementById('flow-name-label').textContent = 'Work Items Demo';
    if (AF.flowTabs) AF.flowTabs.registerRoot();
  }
})();
