/* js/properties.js — right panel, tab builders, form binding */
window.AF = window.AF || {};

var _emptyEl, _contentEl;

AF.initProperties = function () {
  _emptyEl   = document.getElementById('properties-empty');
  _contentEl = document.getElementById('properties-content');
  AF.store.on('selection', renderPanel);
  AF.store.on('nodes', function () { if (AF.store.get('selectedType') === 'node') renderPanel(); });
};

function renderPanel() {
  var id   = AF.store.get('selectedId');
  var type = AF.store.get('selectedType');
  if (!id)           { showEmpty(); return; }
  if (type === 'edge') { renderEdgePanel(AF.store.getEdge(id)); return; }
  var node = AF.store.getNode(id);
  if (!node)         { showEmpty(); return; }

  var def  = AF.getItemDef(node.type, node.category) || {};
  var tabs = def.tabs || ['General'];

  showContent();
  var tabsHtml = tabs.length > 1 ? buildTabs(tabs) : '';
  _contentEl.innerHTML =
    buildHeader(node) +
    tabsHtml +
    tabs.map(function (tab, i) {
      return '<div class="props-tab-content' + (tabs.length === 1 ? ' active' : '') + '" data-content="' + i + '">' + buildTabContent(tab, node, def) + '</div>';
    }).join('') +
    '<div class="props-node-id">ID: ' + node.id + '</div>';

  if (tabs.length > 1) {
    activateTab(_contentEl.querySelector('.props-tab'));
    bindTabClicks();
  }
  bindFormChanges(node);
}

/* ── Header ── */
function buildHeader(node) {
  return '<div class="props-header">'
    + '<div class="ph-row">'
    + '<div class="ph-icon" style="background:' + iconBg(node.category) + ';color:' + iconColor(node.category) + '">' + node.icon + '</div>'
    + '<div class="ph-name" contenteditable="true" data-field="label">' + node.label + '</div>'
    + '</div>'
    + '<span class="ph-type-badge">' + fmtType(node.type) + '</span>'
    + '</div>';
}

function buildTabs(tabs) {
  return '<div class="props-tabs">' +
    tabs.map(function (t, i) { return '<div class="props-tab" data-tab="' + i + '">' + t + '</div>'; }).join('') +
    '</div>';
}

/* ── Tab content router ── */
function buildTabContent(tab, node, def) {
  var p = node.props;
  switch (tab) {
    case 'Select Tool':  return buildToolSelectTab(node, p);
    case 'Select Skill': return buildSkillSelectTab(node, p);
    case 'Select Agent': return buildAgentSelectTab(node, p);
    case 'General':      return buildGeneralTab(node, p);
    case 'Prompt':       return buildPromptTab(p);
    case 'Model':        return buildModelTab(p);
    case 'Tools':        return buildToolsTab(p);
    case 'Memory':       return buildMemoryTab(p);
    case 'Guardrails':   return buildGuardrailsTab(p);
    case 'Input':        return buildIOTab(p,'input');
    case 'Output':       return buildIOTab(p,'output');
    case 'I/O':          return buildFullIOTab(p);
    case 'Retry':        return buildRetryTab(p);
    case 'Branches':     return buildBranchesTab(node, p);
    case 'Condition':    return buildConditionTab(p);
    case 'Routes':       return buildRoutesTab(p);
    case 'Delegation':   return buildDelegationTab(p);
    case 'Coordination': return buildCoordinationTab(p);
    case 'Criteria':     return buildCriteriaTab(p);
    case 'Planning':     return buildPlanningTab(p);
    case 'Execution':    return buildExecutionTab(p);
    case 'Critique':     return buildCritiqueTab(p);
    case 'Context':      return buildContextTab(p);
    case 'Auth':         return buildAuthTab(p);
    case 'Retrieval':    return buildRetrievalTab(p);
    case 'Filters':      return buildFiltersTab(p);
    case 'Approver':     return buildApproverTab(p);
    case 'Timeout':      return buildTimeoutTab(p);
    case 'Message':      return buildMessageTab(p);
    case 'Schema':       return buildSchemaTab(p);
    case 'Request':      return buildRequestTab(p);
    case 'Backend':      return buildBackendTab(p);
    case 'Indexing':     return buildIndexingTab(p);
    case 'Strategy':     return buildStrategyTab(p);
    case 'Rules':        return buildRulesTab(p);
    case 'Action':       return buildActionTab(p);
    case 'Connection':   return buildConnectionTab(p);
    case 'Events':       return buildEventsTab(p);
    case 'Security':     return buildSecurityTab(p);
    case 'Agents':       return buildManagedAgentsTab(p);
    default:             return '<p style="color:var(--text-muted);font-size:12px">Tab "' + tab + '" coming soon.</p>';
  }
}

/* ── Tab builders ── */
function buildToolSelectTab(node, p) {
  var selected = p.toolId || p.toolName;
  var tool = selected && AF.toolsCatalog ? AF.toolsCatalog.findById(selected) : null;
  var display = p.toolDisplayName || p.toolName || '';
  var plugin = p.pluginName || '';
  var desc = p.toolDescription || (tool && tool.description) || '';

  var selectedBlock = selected
    ? '<div class="tool-selected-card">'
      + '<div class="tool-selected-head"><span class="tool-selected-icon">🔧</span>'
      + '<div><div class="tool-selected-name">' + esc(display) + '</div>'
      + '<div class="tool-selected-meta">' + esc(plugin) + (p.toolName ? ' · ' + esc(p.toolName) : '') + '</div></div></div>'
      + (desc ? '<div class="tool-selected-desc">' + esc(desc) + '</div>' : '')
      + '</div>'
    : '<div class="tool-selected-empty">No tool selected yet.</div>';

  return '<div class="tool-select-panel">'
    + '<p class="tool-select-hint">Choose an MCP/API tool exposed by the host application.</p>'
    + selectedBlock
    + '<button type="button" class="btn-primary tool-select-btn" data-action="open-tool-picker">'
    + (selected ? 'Change tool…' : 'Select tool…')
    + '</button>'
    + '</div>';
}

function buildSkillSelectTab(node, p) {
  var selected = p.skillId || p.skillName;
  var skill = selected && AF.skillsCatalog ? AF.skillsCatalog.findById(selected) : null;
  var display = p.skillDisplayName || p.skillName || '';
  var meta = [p.category, p.version ? 'v' + p.version : ''].filter(Boolean).join(' · ');
  var desc = p.skillDescription || (skill && skill.description) || '';

  var selectedBlock = selected
    ? '<div class="tool-selected-card">'
      + '<div class="tool-selected-head"><span class="tool-selected-icon">♻</span>'
      + '<div><div class="tool-selected-name">' + esc(display) + '</div>'
      + '<div class="tool-selected-meta">' + esc(meta) + (p.skillName ? ' · ' + esc(p.skillName) : '') + '</div></div></div>'
      + (desc ? '<div class="tool-selected-desc">' + esc(desc) + '</div>' : '')
      + '</div>'
    : '<div class="tool-selected-empty">No skill selected yet.</div>';

  return '<div class="tool-select-panel">'
    + '<p class="tool-select-hint">Choose a reusable skill from the host application.</p>'
    + selectedBlock
    + '<button type="button" class="btn-primary tool-select-btn" data-action="open-skill-picker">'
    + (selected ? 'Change skill…' : 'Select skill…')
    + '</button>'
    + '</div>';
}

function buildAgentSelectTab(node, p) {
  var selected = p.agentRefId || p.agentRefName;
  var agent = selected && AF.agentsCatalog ? AF.agentsCatalog.findById(selected) : null;
  var display = p.agentDisplayName || p.agentRefName || '';
  var meta = [p.role, p.model].filter(Boolean).join(' · ');
  var desc = p.agentDescription || (agent && agent.description) || '';

  var selectedBlock = selected
    ? '<div class="tool-selected-card">'
      + '<div class="tool-selected-head"><span class="tool-selected-icon">🤖</span>'
      + '<div><div class="tool-selected-name">' + esc(display) + '</div>'
      + '<div class="tool-selected-meta">' + esc(meta) + (p.agentRefName ? ' · ' + esc(p.agentRefName) : '') + '</div></div></div>'
      + (desc ? '<div class="tool-selected-desc">' + esc(desc) + '</div>' : '')
      + '</div>'
    : '<div class="tool-selected-empty">No agent selected yet.</div>';

  return '<div class="tool-select-panel">'
    + '<p class="tool-select-hint">Choose a registered agent from the host application.</p>'
    + selectedBlock
    + '<button type="button" class="btn-primary tool-select-btn" data-action="open-agent-picker">'
    + (selected ? 'Change agent…' : 'Select agent…')
    + '</button>'
    + '</div>';
}

function buildGeneralTab(node, p) {
  var t = node.type, extra = '';
  if (t === 'start')           extra = field('Trigger Type', sel('trigger', p.trigger, ['chat','api','schedule','event','webhook']));
  else if (t === 'end')        extra = field('Return Format', sel('returnFormat', p.returnFormat, ['json','text','markdown']));
  else if (isAgentType(t) && !isWorkAgentNode(node)) extra = field('Role', inp('role',p.role,"Describe the agent's role")) + field('Goal', inp('goal',p.goal,'What should this agent achieve?'));
  else if (t==='task')         extra = field('Description', ta('description',p.description,'What does this task do?',3)) + field('Assigned Agent', inp('assignedAgent',p.assignedAgent,'Agent ID or name'));
  else if (t==='llm-task')     extra = field('Description', ta('description',p.description||'','',2)) + field('Assigned Agent', inp('assignedAgent',p.assignedAgent||'',''));
  else if (t==='tool-task')    extra = '';
  else if (t==='tool-call')    extra = field('Call Type', sel('callType',p.callType||'mcp',['mcp','api'])) + field('Server / Endpoint', inp('serverUrl',p.serverUrl||'','mcp://... or https://...')) + field('Tool Name', inp('toolName',p.toolName||'','e.g. search_documents'));
  else if (t==='skill')        extra = isWorkSkillNode(node) ? '' : field('Skill ID', inp('skillId',p.skillId||'','Unique skill identifier')) + field('Description', ta('description',p.description||'','What this reusable skill does',2)) + field('Version', inp('version',p.version||'1.0',''));
  else if (isWorkAgentNode(node)) extra = '';
  else if (t==='subflow')      extra = field('Flow Reference', inp('flowRef',p.flowRef||'','Flow name or path')) + field('Flow ID', inp('flowId',p.flowId||'','Nested flow ID')) + field('Description', ta('description',p.description||'','',2)) + tog('Run Async','async',p.async);
  else if (t==='api-task')     extra = field('Method', sel('method',p.method,['GET','POST','PUT','PATCH','DELETE'])) + field('URL', inp('url',p.url,'https://...'));
  else if (t==='human-approval') extra = field('Approval Question', ta('approvalQuestion',p.approvalQuestion,'What should the approver decide?',3));
  else if (t==='notification') extra = field('Channel', sel('channel',p.channel,['slack','email','teams','webhook','sms'])) + field('Recipient', inp('recipient',p.recipient,'#channel or email'));
  else if (t==='memory')       extra = field('Memory Type', sel('memoryType',p.memoryType,['short-term','long-term','episodic','semantic']));
  else if (t==='guardrail')    extra = field('Guardrail Type', sel('guardrailType',p.guardrailType,['content-filter','pii-filter','topic-restriction','rate-limit','output-validation']));
  else if (t==='decision')     extra = field('Condition Type', sel('conditionType',p.conditionType,['expression','intent','classification','confidence','rule'])) + field('Condition', ta('condition',p.condition,'e.g. intent == "billing"',2));
  else if (t==='loop')         extra = field('Loop Type', sel('loopType',p.loopType,['for-each','while','count'])) + field('Iterate Over', inp('iterateOver',p.iterateOver,'variable or condition'));
  return extra || '<p class="empty-note" style="color:var(--text-muted);font-size:12px">Configure using the tabs above.</p>';
}

function buildPromptTab(p) {
  return field('System Prompt', ta('systemPrompt', p.systemPrompt||p.instructions||'', 'Define behavior, constraints, persona...', 8))
       + field('Instructions',  ta('instructions', p.instructions||'', 'Step-by-step task instructions...', 5));
}
function buildModelTab(p) {
  var modelOpts = AF.MODEL_OPTIONS.map(function (m) {
    return '<option value="' + m.value + '"' + (p.model===m.value?' selected':'') + '>' + m.label + '</option>';
  }).join('');
  return field('Model', '<select class="form-select" data-prop="model">' + modelOpts + '</select>')
       + field('Temperature', slider('temperature', p.temperature??0.7, 0, 2, 0.05))
       + field('Max Tokens',     inp('maxTokens',    p.maxTokens??4096,   '','number'))
       + field('Max Iterations', inp('maxIterations',p.maxIterations??10, '','number'))
       + field('Timeout (s)',    inp('timeout',       p.timeout??120,      '','number'));
}
function buildToolsTab(p) {
  var tools = p.tools || [];
  return '<div class="props-section-title">Allowed Tools</div>'
    + '<div class="item-list">'
    + tools.map(function (t) {
        return '<div class="item-list-row"><span class="item-icon">🔧</span><span class="item-name">' + t + '</span>'
             + '<span class="item-remove" data-remove-tool="' + t + '">✕</span></div>';
      }).join('')
    + '</div>'
    + '<button class="btn-add-item" data-action="add-tool">+ Add Tool</button>';
}
function buildMemoryTab(p) {
  return field('Memory Scope', sel('memoryScope',p.memoryScope||'session',['session','user','global','agent']))
       + field('Fallback Agent', inp('fallbackAgent',p.fallbackAgent||'','Agent ID to delegate on failure'));
}
function buildGuardrailsTab(p) {
  return '<div class="props-section-title">Content Guardrails</div>'
       + field('Topics to Block', inp('topics', Array.isArray(p.topics)?p.topics.join(', '):'', 'violence, illegal, ...'))
       + tog('Require Citation','citationRequired',p.citationRequired)
       + tog('PII Filtering','piiFilter',p.piiFilter);
}
function buildIOTab(p, dir) {
  var key = dir==='input' ? 'inputSchema' : 'outputSchema';
  return field((dir==='input'?'Input':'Output')+' Schema (JSON)', ta(key,p[key]||'','{"type":"object","properties":{...}}',5));
}
function buildFullIOTab(p) {
  return field('Input Variables',  inp('inputVars',  (p.inputVars||[]).join(', '),'var1, var2, ...'))
       + field('Output Variables', inp('outputVars', (p.outputVars||[]).join(', '),'result, status, ...'))
       + field('Expected Output',  ta('expectedOutput',p.expectedOutput||'','Describe expected output format',3));
}
function buildRetryTab(p) {
  return field('Retry Policy', sel('retryPolicy',p.retryPolicy||'linear',['none','linear','exponential']))
       + field('Max Retries',  inp('maxRetries',p.maxRetries??3,'','number'))
       + field('Success Criteria', ta('successCriteria',p.successCriteria||'','e.g. status == 200',2));
}
function buildBranchesTab(node, p) {
  if (node.type === 'parallel') {
    return field('Number of Branches', inp('branches',p.branches??2,'','number'))
         + tog('Wait for All','waitForAll',p.waitForAll)
         + field('Timeout (s)', inp('timeout',p.timeout??120,'','number'));
  }
  var branches = p.branches || [];
  return '<div class="props-section-title">Branch Conditions</div>'
    + branches.map(function (b, i) {
        return '<div class="form-group">'
          + '<label class="form-label">Branch ' + (i+1) + ' — Label</label>'
          + '<input class="form-input" value="' + esc(b.label) + '" data-branch-label="' + i + '" />'
          + '<label class="form-label" style="margin-top:4px">Condition</label>'
          + '<input class="form-input" value="' + esc(b.condition) + '" data-branch-cond="' + i + '" placeholder="expression..." />'
          + '</div>';
      }).join('')
    + '<button class="btn-add-item" data-action="add-branch">+ Add Branch</button>'
    + field('Fallback Branch', inp('fallbackBranch',p.fallbackBranch||'','Default branch label'));
}
function buildConditionTab(p) {
  return field('Exit Condition', ta('exitCondition',p.exitCondition||'','e.g. count >= 10',2))
       + field('Max Iterations', inp('maxIterations',p.maxIterations??50,'','number'))
       + tog('Break on Error','breakOnError',p.breakOnError);
}
function buildRoutesTab(p) {
  var routes = p.routes || [];
  return '<div class="props-section-title">Routing Rules</div>'
    + '<div class="item-list">'
    + routes.map(function (r, i) {
        return '<div class="item-list-row"><span class="item-icon">↗</span><span class="item-name">'+(r.label||'Route '+(i+1))+': '+(r.condition||'...')+'</span></div>';
      }).join('')
    + '</div>'
    + '<button class="btn-add-item" data-action="add-route">+ Add Route</button>'
    + field('Confidence Threshold', slider('confidenceThreshold',p.confidenceThreshold??0.75,0,1,0.05))
    + field('Fallback Route', inp('fallbackRoute',p.fallbackRoute||'','Agent ID or node ID'));
}
function buildDelegationTab(p) {
  return field('Parent Agent',    inp('parentAgent',p.parentAgent||'','Parent agent ID'))
       + field('Specialization',  inp('specialization',p.specialization||'','e.g. Billing, Troubleshooting'))
       + field('Delegation Rules',ta('delegationRules',p.delegationRules||'','When to delegate...',3))
       + field('Return Format',   sel('returnFormat',p.returnFormat||'text',['text','json','markdown','structured']));
}
function buildCoordinationTab(p) {
  return field('Coordination Strategy', sel('coordinationStrategy',p.coordinationStrategy||'sequential',['sequential','parallel','hierarchical','round-robin']));
}
function buildCriteriaTab(p) {
  return field('Evaluation Criteria', ta('criteria',p.criteria||'','What to evaluate and how',4))
       + field('Score Threshold', slider('scoreThreshold',p.scoreThreshold??0.8,0,1,0.05))
       + field('Output Key', inp('outputKey',p.outputKey||'evaluation',''));
}
function buildPlanningTab(p) {
  return field('Planning Strategy', sel('planningStrategy',p.planningStrategy||'step-by-step',['step-by-step','tree-of-thought','react','chain-of-thought']))
       + field('Max Steps', inp('maxSteps',p.maxSteps??10,'','number'));
}
function buildExecutionTab(p) {
  return field('Execution Mode', sel('executionMode',p.executionMode||'sequential',['sequential','parallel','async']));
}
function buildCritiqueTab(p) {
  return field('Critique Focus', ta('critiqueFocus',p.critiqueFocus||'','What aspects to critique',3))
       + field('Output Key', inp('outputKey',p.outputKey||'critique',''));
}
function buildContextTab(p) {
  return tog('Include User Context','userContext',p.userContext)
       + tog('Include Tenant Context','tenantContext',p.tenantContext)
       + field('Input Schema (JSON)', ta('inputSchema',p.inputSchema||'','{"type":"object",...}',4));
}
function buildAuthTab(p) {
  return field('Authentication', sel('auth',p.auth||'none',['none','api-key','bearer','basic','oauth2']))
       + field('Rate Limit', inp('rateLimit',p.rateLimit||'','e.g. 100/min'))
       + field('Error Handling', sel('errorHandling',p.errorHandling||'raise',['raise','log','fallback','retry']));
}
function buildRetrievalTab(p) {
  return field('Knowledge Source', inp('knowledgeSource',p.knowledgeSource||'','Source ID or name'))
       + field('Search Type', sel('searchType',p.searchType||'semantic',['semantic','keyword','hybrid']))
       + field('Top K', inp('topK',p.topK??5,'','number'))
       + tog('Re-ranking','reranking',p.reranking)
       + tog('Citation Required','citationRequired',p.citationRequired);
}
function buildFiltersTab(p) { return field('Filters (JSON)', ta('filters',p.filters||'','{"department":"engineering"}',3)); }
function buildApproverTab(p) {
  return field('Approver Role',    inp('approverRole',p.approverRole||'','e.g. Manager, Compliance'))
       + field('Escalation Path',  inp('escalationPath',p.escalationPath||'','Escalate to if no response'))
       + tog('Allow Edit Before Approval','allowEdit',p.allowEdit);
}
function buildTimeoutTab(p) { return field('Timeout (seconds)', inp('timeout',p.timeout??3600,'','number')); }
function buildMessageTab(p) {
  return field('Message Template', ta('message',p.message||'','Use {{variable}} for substitutions',4))
       + tog('On Success','onSuccess',p.onSuccess)
       + tog('On Failure','onFailure',p.onFailure);
}
function buildSchemaTab(p) {
  return field('Input Schema (JSON)',  ta('inputSchema',p.inputSchema||'','',3))
       + field('Output Schema (JSON)', ta('outputSchema',p.outputSchema||'','',3));
}
function buildRequestTab(p) {
  return field('Headers (JSON)', ta('headers',p.headers||'','{"Authorization":"Bearer ..."}',2))
       + field('Body (JSON)',     ta('body',p.body||'','',3))
       + field('Output Key',     inp('outputKey',p.outputKey||'response',''));
}
function buildBackendTab(p) {
  return field('Backend', sel('backend',p.backend||'in-memory',['in-memory','redis','postgres','pinecone','weaviate']))
       + field('TTL (seconds)', inp('ttl',p.ttl??3600,'','number'))
       + field('Scope', sel('scope',p.scope||'session',['session','user','global']));
}
function buildIndexingTab(p) {
  return field('Source URL / Path', inp('source',p.source||'','https://... or s3://...'))
       + field('Embedding Model', sel('embeddingModel',p.embeddingModel||'text-embedding-3-small',['text-embedding-3-small','text-embedding-3-large']))
       + field('Chunk Size', inp('chunkSize',p.chunkSize??512,'','number'))
       + field('Overlap',    inp('overlap',p.overlap??64,'','number'));
}
function buildStrategyTab(p) {
  return field('Merge Strategy', sel('mergeStrategy',p.mergeStrategy||'all',['all','first','majority','union']))
       + field('Output Key', inp('outputKey',p.outputKey||'merged',''));
}
function buildRulesTab(p)  { return field('Rules (one per line)', ta('rules',p.rules||'','No personal information\nNo violence\n...',5)); }
function buildActionTab(p) { return field('Action on Violation', sel('action',p.action||'block',['block','warn','log','modify','redirect'])); }
function buildConnectionTab(p) {
  return field('System Type', sel('systemType',p.systemType||'database',['database','crm','erp','queue','storage','api']))
       + field('Connection String', inp('connectionString',p.connectionString||'','postgres://... or endpoint'))
       + field('Schema / Config', ta('schema',p.schema||'','',3));
}
function buildEventsTab(p)   { return field('Events (comma-separated)', inp('events',(p.events||[]).join(', '),'created, updated, deleted')); }
function buildSecurityTab(p) { return field('Webhook Secret', inp('secret',p.secret||'','Used to verify signatures')); }
function buildManagedAgentsTab(p) {
  var agents = p.managedAgents || [];
  return '<div class="props-section-title">Managed Agents</div>'
    + '<div class="item-list">'
    + agents.map(function (a) {
        return '<div class="item-list-row"><span class="item-icon">🤖</span><span class="item-name">'+a+'</span>'
             + '<span class="item-remove" data-remove-agent="'+a+'">✕</span></div>';
      }).join('')
    + '</div>'
    + '<button class="btn-add-item" data-action="add-managed-agent">+ Add Agent</button>';
}

/* ── Edge panel ── */
function renderEdgePanel(edge) {
  if (!edge) { showEmpty(); return; }
  showContent();
  var typeOpts = AF.EDGE_TYPES.map(function (et) {
    return '<option value="'+et.value+'"'+(edge.type===et.value?' selected':'')+'>'+et.label+'</option>';
  }).join('');
  _contentEl.innerHTML =
    '<div class="props-header"><div class="ph-row"><div class="ph-name">Connection</div></div><span class="ph-type-badge">Edge</span></div>'
    + '<div style="padding:12px 14px">'
    + '<div class="form-group"><label class="form-label">Edge Type</label><select class="form-select" id="edge-type-sel">'+typeOpts+'</select></div>'
    + '<div class="form-group"><label class="form-label">Label</label><input class="form-input" id="edge-label-inp" value="'+esc(edge.label||'')+'" placeholder="Optional label..." /></div>'
    + '<button class="btn-outline" id="edge-delete-btn" style="width:100%;color:var(--danger);border-color:var(--danger);margin-top:8px">Delete Connection</button>'
    + '</div>'
    + '<div class="props-node-id">ID: '+edge.id+'</div>';
  document.getElementById('edge-type-sel').addEventListener('change', function (e) { AF.store.updateEdge(edge.id, { type:e.target.value }); });
  document.getElementById('edge-label-inp').addEventListener('input',  function (e) { AF.store.updateEdge(edge.id, { label:e.target.value }); });
  document.getElementById('edge-delete-btn').addEventListener('click', function ()  { AF.store.deleteEdge(edge.id); });
}

/* ── Form binding ── */
function bindFormChanges(node) {
  var nameEl = _contentEl.querySelector('[data-field="label"]');
  if (nameEl) nameEl.addEventListener('input', function () { AF.store.updateNode(node.id, { label: nameEl.textContent.trim() }); });

  _contentEl.querySelectorAll('[data-prop]').forEach(function (el) {
    el.addEventListener('change', function () { saveProp(node.id, el); });
    el.addEventListener('input',  function () { saveProp(node.id, el); });
  });
  _contentEl.querySelectorAll('.toggle-switch').forEach(function (sw) {
    sw.addEventListener('click', function () {
      sw.classList.toggle('on');
      AF.store.updateNode(node.id, { props: mkObj(sw.dataset.prop, sw.classList.contains('on')) });
    });
  });
  _contentEl.querySelectorAll('input[type="range"]').forEach(function (s) {
    var valEl = s.parentElement && s.parentElement.querySelector('.slider-val');
    s.addEventListener('input', function () {
      if (valEl) valEl.textContent = parseFloat(s.value).toFixed(2);
      saveProp(node.id, s);
    });
  });
  _contentEl.querySelectorAll('[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () { handleAction(btn.dataset.action, node); });
  });
  _contentEl.querySelectorAll('[data-remove-tool]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tools = (AF.store.getNode(node.id).props.tools||[]).filter(function(t){return t!==btn.dataset.removeTool;});
      AF.store.updateNode(node.id, { props:{ tools:tools } });
    });
  });
  _contentEl.querySelectorAll('[data-branch-label]').forEach(function (inp) {
    inp.addEventListener('input', function () { updateBranch(node.id, parseInt(inp.dataset.branchLabel), 'label', inp.value); });
  });
  _contentEl.querySelectorAll('[data-branch-cond]').forEach(function (inp) {
    inp.addEventListener('input', function () { updateBranch(node.id, parseInt(inp.dataset.branchCond), 'condition', inp.value); });
  });
}

function saveProp(nodeId, el) {
  var key = el.dataset.prop;
  var val = el.type === 'range' ? parseFloat(el.value) : el.type === 'number' ? Number(el.value) : el.value;
  AF.store.updateNode(nodeId, { props: mkObj(key, val) });
}
function mkObj(k, v) { var o={}; o[k]=v; return o; }
function updateBranch(nodeId, idx, fld, val) {
  var node = AF.store.getNode(nodeId); if (!node) return;
  var branches = JSON.parse(JSON.stringify(node.props.branches||[]));
  if (!branches[idx]) return;
  branches[idx][fld] = val;
  AF.store.updateNode(nodeId, { props:{ branches:branches } });
}
function handleAction(action, node) {
  if (action==='open-tool-picker') {
    AF.entityPicker.open({ kind: 'tool', nodeId: node.id });
    return;
  }
  if (action==='open-skill-picker') {
    AF.entityPicker.open({ kind: 'skill', nodeId: node.id });
    return;
  }
  if (action==='open-agent-picker') {
    AF.entityPicker.open({ kind: 'agent', nodeId: node.id });
    return;
  }
  if (action==='add-tool') {
    var name = prompt('Tool name:'); if (!name) return;
    var tools = (AF.store.getNode(node.id).props.tools||[]).concat([name]);
    AF.store.updateNode(node.id, { props:{ tools:tools } });
  }
  if (action==='add-branch') {
    var branches = (AF.store.getNode(node.id).props.branches||[]).concat([{label:'Branch',condition:''}]);
    AF.store.updateNode(node.id, { props:{ branches:branches } });
  }
  if (action==='add-route') {
    var cond  = prompt('Condition:'); if (!cond) return;
    var label = prompt('Label:');
    var routes = (AF.store.getNode(node.id).props.routes||[]).concat([{label:label,condition:cond}]);
    AF.store.updateNode(node.id, { props:{ routes:routes } });
  }
  if (action==='add-managed-agent') {
    var id = prompt('Agent ID:'); if (!id) return;
    var managedAgents = (AF.store.getNode(node.id).props.managedAgents||[]).concat([id]);
    AF.store.updateNode(node.id, { props:{ managedAgents:managedAgents } });
  }
}

function bindTabClicks() {
  _contentEl.querySelectorAll('.props-tab').forEach(function (tab) {
    tab.addEventListener('click', function () { activateTab(tab); });
  });
}
function activateTab(tab) {
  if (!tab) return;
  var idx = tab.dataset.tab;
  _contentEl.querySelectorAll('.props-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab===idx); });
  _contentEl.querySelectorAll('.props-tab-content').forEach(function (c) { c.classList.toggle('active', c.dataset.content===idx); });
}
function showEmpty()   { _emptyEl.style.display=''; _contentEl.style.display='none'; }
function showContent() { _emptyEl.style.display='none'; _contentEl.style.display='flex'; }

/* ── Field helpers ── */
function field(label, ctrl) { return '<div class="form-group"><label class="form-label">'+label+'</label>'+ctrl+'</div>'; }
function inp(prop, val, ph, type) {
  val  = val  === undefined || val  === null ? '' : val;
  ph   = ph   || '';
  type = type || 'text';
  return '<input class="form-input" type="'+type+'" data-prop="'+prop+'" value="'+esc(String(val))+'" placeholder="'+ph+'" />';
}
function ta(prop, val, ph, rows) {
  val  = val  === undefined || val  === null ? '' : val;
  ph   = ph   || '';
  rows = rows || 4;
  return '<textarea class="form-textarea" data-prop="'+prop+'" rows="'+rows+'" placeholder="'+ph+'">'+esc(String(val))+'</textarea>';
}
function sel(prop, val, opts) {
  return '<select class="form-select" data-prop="'+prop+'">'
    + opts.map(function(o){return '<option value="'+o+'"'+(val===o?' selected':'')+'>'+o+'</option>';}).join('')
    + '</select>';
}
function tog(label, prop, val) {
  return '<div class="form-toggle"><label>'+label+'</label>'
    + '<div class="toggle-switch'+(val?' on':'')+'" data-prop="'+prop+'"></div></div>';
}
function slider(prop, val, min, max, step) {
  return '<div class="form-slider-row">'
    + '<input class="form-slider" type="range" data-prop="'+prop+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" />'
    + '<span class="slider-val">'+parseFloat(val).toFixed(2)+'</span></div>';
}
function esc(v) { return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function isAgentType(t) { return ['agent','sub-agent','supervisor','router','evaluator','planner','executor','critic'].indexOf(t)!==-1; }
function isWorkAgentNode(node) { return node && node.type === 'agent' && node.category === 'work'; }
function isWorkSkillNode(node) { return node && node.type === 'skill' && node.category === 'work'; }
function iconBg(cat)    { return ({agent:'rgba(74,124,255,0.15)',work:'rgba(46,204,113,0.15)',infra:'rgba(155,89,182,0.15)',control:'rgba(243,156,18,0.15)',start:'rgba(26,188,156,0.15)',end:'rgba(231,76,60,0.15)'})[cat]||'rgba(139,149,176,0.15)'; }
function iconColor(cat) { return ({agent:'#4a7cff',work:'#2ecc71',infra:'#9b59b6',control:'#f39c12',start:'#1abc9c',end:'#e74c3c'})[cat]||'#8b95b0'; }
function fmtType(t)     { return t.replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}); }
