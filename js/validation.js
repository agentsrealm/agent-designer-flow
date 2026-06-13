/* js/validation.js — flow validation rules */
window.AF = window.AF || {};

AF.validateFlow = function () {
  var nodes   = AF.store.get('nodes');
  var edges   = AF.store.get('edges');
  var results = [];

  var startNodes = nodes.filter(function(n){return n.type==='start';});
  var endNodes   = nodes.filter(function(n){return n.type==='end';});

  if (startNodes.length === 0)
    results.push({ severity:'error', msg:'Flow must have exactly one Start node.', nodeId:null });
  else if (startNodes.length > 1)
    results.push({ severity:'error', msg:'Flow has '+startNodes.length+' Start nodes — only one allowed.', nodeId:startNodes[1].id });

  if (endNodes.length === 0)
    results.push({ severity:'error', msg:'Flow must have at least one End node.', nodeId:null });

  var agentTypes = ['agent','sub-agent','supervisor','router','evaluator','planner','executor','critic'];

  nodes.forEach(function (node) {
    var p     = node.props || {};
    var conns = AF.store.edgesForNode(node.id);

    if (!conns.length && node.type !== 'start' && node.type !== 'end')
      results.push({ severity:'warning', msg:'"'+node.label+'" has no connections.', nodeId:node.id });

    if (agentTypes.indexOf(node.type) !== -1 && !p.model)
      results.push({ severity:'error', msg:'Agent "'+node.label+'" must have a model selected.', nodeId:node.id });

    if (node.type === 'task' && !p.assignedAgent)
      results.push({ severity:'error', msg:'Task "'+node.label+'" must have an assigned agent.', nodeId:node.id });

    if (node.type === 'decision') {
      var outgoing = edges.filter(function(e){return e.source===node.id;});
      if (outgoing.length < 2)
        results.push({ severity:'error', msg:'Decision "'+node.label+'" must have at least 2 outgoing branches.', nodeId:node.id });
    }

    if (node.type === 'loop' && !p.exitCondition && !p.maxIterations)
      results.push({ severity:'warning', msg:'Loop "'+node.label+'" has no exit condition or max iterations.', nodeId:node.id });

    if (node.type === 'human-approval' && !p.approverRole)
      results.push({ severity:'error', msg:'Human Approval "'+node.label+'" must define an approver role.', nodeId:node.id });

    if (node.type === 'tool-task' && !p.toolName && !p.toolId)
      results.push({ severity:'warning', msg:'Tool Task "'+node.label+'" has no tool selected.', nodeId:node.id });

    if (node.type === 'api-task' && !p.url)
      results.push({ severity:'warning', msg:'API Task "'+node.label+'" has no URL.', nodeId:node.id });
  });

  if (!results.length)
    results.push({ severity:'ok', msg:'Flow is valid. No issues found.', nodeId:null });

  return results;
};

AF.renderValidation = function (results) {
  var container = document.getElementById('validation-results');
  container.innerHTML = results.map(function (r) {
    var icon = r.severity==='error' ? '✗' : r.severity==='warning' ? '⚠' : '✓';
    var ref  = r.nodeId ? ' <span class="node-ref" data-node-id="'+r.nodeId+'">[focus]</span>' : '';
    return '<div class="validation-item '+r.severity+'"><span class="icon">'+icon+'</span><span class="msg">'+r.msg+ref+'</span></div>';
  }).join('');

  container.querySelectorAll('.node-ref').forEach(function (el) {
    el.addEventListener('click', function () {
      var id   = el.dataset.nodeId;
      var node = AF.store.getNode(id);
      AF.store.select(id, 'node');
      if (node) AF.store.setPan(window.innerWidth/2 - node.x*AF.store.get('zoom') - 80, window.innerHeight/2 - node.y*AF.store.get('zoom') - 40);
    });
  });

  return results.filter(function(r){return r.severity==='error';}).length;
};
