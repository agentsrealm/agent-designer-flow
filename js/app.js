/* js/app.js — root: wires everything, topbar, context menu, import/export, starter flow */
window.AF = window.AF || {};

(function () {
  /* ── Boot ── */
  AF.initPalette();
  AF.initCanvas();
  AF.initProperties();
  AF.toolsCatalog.init();
  AF.toolPicker.init();
  bindTopbar();
  bindContextMenu();
  bindImportExport();
  loadStarterFlow();
  if (AF.embed && AF.embed.isEmbed) AF.embed.postReady();

  /* ── Topbar ── */
  function bindTopbar() {
    document.getElementById('btn-undo').addEventListener('click', function(){ AF.store.undo(); });
    document.getElementById('btn-redo').addEventListener('click', function(){ AF.store.redo(); });
    document.getElementById('btn-zoom-in').addEventListener('click', AF.zoomIn);
    document.getElementById('btn-zoom-out').addEventListener('click', AF.zoomOut);
    document.getElementById('btn-fit').addEventListener('click', AF.fitScreen);
    document.getElementById('btn-auto-layout').addEventListener('click', AF.autoLayout);

    document.getElementById('btn-validate').addEventListener('click', function () {
      var panel   = document.getElementById('validation-panel');
      var results = AF.validateFlow();
      AF.renderValidation(results);
      panel.classList.toggle('hidden');
    });
    document.getElementById('btn-close-validation').addEventListener('click', function () {
      document.getElementById('validation-panel').classList.add('hidden');
    });

    document.getElementById('btn-test-run').addEventListener('click', function () {
      document.getElementById('testrun-panel').classList.toggle('hidden');
    });
    document.getElementById('btn-close-testrun').addEventListener('click', function () {
      document.getElementById('testrun-panel').classList.add('hidden');
    });
    document.getElementById('btn-run-flow').addEventListener('click', simulateRun);

    var panBtn = document.getElementById('btn-pan-mode');
    panBtn.addEventListener('click', function () {
      var on = !AF.isPanMode();
      AF.setPanMode(on);
      panBtn.classList.toggle('active', on);
      panBtn.title = on ? 'Pan Mode ON — click to disable' : 'Pan Mode (drag canvas)';
    });

    document.getElementById('btn-new').addEventListener('click', function () {
      if (AF.store.get('nodes').length > 0) {
        if (!confirm('Clear the canvas and start a new flow?')) return;
      }
      AF.store.importJSON({
        schema: 'agent-flow/v1',
        metadata: { name: 'Untitled Flow' },
        nodes: [], edges: [], runtime: { engine: 'agentcore' },
      });
      document.getElementById('flow-name-label').textContent = 'Untitled Flow';
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

  /* ── Import / Export ── */
  function bindImportExport() {
    document.getElementById('btn-export').addEventListener('click', function () {
      var data = JSON.stringify(AF.store.exportJSON(), null, 2);
      var blob = new Blob([data], { type:'application/json' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href = url; a.download = (AF.store.get('flowName')||'flow').replace(/\s+/g,'_') + '.flow.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    document.getElementById('btn-import').addEventListener('click', function () {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var data = JSON.parse(ev.target.result);
          AF.store.importJSON(data);
          document.getElementById('flow-name-label').textContent = AF.store.get('flowName');
        } catch (err) { alert('Invalid JSON file: ' + err.message); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  /* ── Starter demo flow ── */
  function loadStarterFlow() {
    AF.store.importJSON({
      schema: 'agent-flow/v1',
      metadata: { name: 'Customer Support Flow' },
      nodes: [
        { id:'node_1', type:'start',          category:'start',   label:'Start',            icon:'▶', x:60,  y:80,  props:{ trigger:'chat', userContext:true } },
        { id:'node_2', type:'router',          category:'agent',   label:'Intent Router',    icon:'↗', x:320, y:80,  props:{ name:'Router', routingStrategy:'intent', confidenceThreshold:0.75, model:'claude-haiku-4-5-20251001', routes:[{label:'Billing',condition:'intent == "billing"'},{label:'Technical',condition:'intent == "technical"'}], fallbackRoute:'' } },
        { id:'node_3', type:'agent',           category:'agent',   label:'Billing Agent',    icon:'🤖',x:120, y:280, props:{ name:'Billing Agent', role:'Billing Specialist', goal:'Resolve billing inquiries', model:'claude-sonnet-4-6', temperature:0.5, tools:['lookup_invoice','refund_tool'], memoryScope:'session' } },
        { id:'node_4', type:'agent',           category:'agent',   label:'Support Agent',    icon:'🤖',x:520, y:280, props:{ name:'Support Agent', role:'Technical Support', goal:'Resolve technical issues', model:'claude-sonnet-4-6', temperature:0.7, tools:['search_docs','create_ticket'], memoryScope:'session' } },
        { id:'node_5', type:'human-approval',  category:'work',    label:'Manager Approval', icon:'👤',x:120, y:480, props:{ name:'Manager Approval', approverRole:'Manager', approvalQuestion:'Approve refund?', timeout:3600 } },
        { id:'node_6', type:'decision',        category:'control', label:'Resolved?',        icon:'⑂', x:520, y:480, props:{ name:'Resolved?', conditionType:'expression', condition:'resolved == true', branches:[{label:'Yes',condition:'resolved == true'},{label:'No',condition:'resolved == false'}], fallbackBranch:'No' } },
        { id:'node_7', type:'notification',    category:'work',    label:'Send Summary',     icon:'🔔',x:320, y:680, props:{ name:'Send Summary', channel:'email', recipient:'{{user.email}}', message:'Your issue has been resolved.', onSuccess:true, onFailure:false } },
        { id:'node_8', type:'end',             category:'end',     label:'End',              icon:'⏹', x:320, y:860, props:{ name:'End', returnFormat:'json' } },
      ],
      edges: [
        { id:'edge_1', source:'node_1', target:'node_2', type:'control',  label:'' },
        { id:'edge_2', source:'node_2', target:'node_3', type:'delegate', label:'billing' },
        { id:'edge_3', source:'node_2', target:'node_4', type:'delegate', label:'technical' },
        { id:'edge_4', source:'node_3', target:'node_5', type:'approval', label:'refund?' },
        { id:'edge_5', source:'node_4', target:'node_6', type:'control',  label:'' },
        { id:'edge_6', source:'node_5', target:'node_7', type:'control',  label:'approved' },
        { id:'edge_7', source:'node_6', target:'node_7', type:'control',  label:'yes' },
        { id:'edge_8', source:'node_6', target:'node_4', type:'fallback', label:'retry' },
        { id:'edge_9', source:'node_7', target:'node_8', type:'control',  label:'' },
      ],
      runtime: { engine:'agentcore' },
    });
    document.getElementById('flow-name-label').textContent = 'Customer Support Flow';
  }
})();
