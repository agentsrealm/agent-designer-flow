/* js/store.js — central reactive state */
window.AF = window.AF || {};

(function () {
  let _listeners = [];

  const _state = {
    flowName: 'Untitled Flow',
    nodes: [], edges: [],
    selectedId: null, selectedType: null,
    zoom: 1, panX: 0, panY: 0,
    history: [], future: [],
    _counter: 1,
  };

  function snapshot() {
    return JSON.parse(JSON.stringify({ nodes: _state.nodes, edges: _state.edges }));
  }
  function emit(event) {
    _listeners.filter(l => l.event === event).forEach(l => l.fn());
  }

  AF.store = {
    get(key)      { return _state[key]; },
    getNode(id)   { return _state.nodes.find(n => n.id === id); },
    getEdge(id)   { return _state.edges.find(e => e.id === id); },
    getSelected()  {
      if (!_state.selectedId) return null;
      if (_state.selectedType === 'node') return AF.store.getNode(_state.selectedId);
      if (_state.selectedType === 'edge') return AF.store.getEdge(_state.selectedId);
      return null;
    },
    edgesForNode(nodeId) {
      return _state.edges.filter(e => e.source === nodeId || e.target === nodeId);
    },

    setZoom(z)    { _state.zoom = Math.max(0.2, Math.min(3, z)); emit('zoom'); },
    setPan(x, y)  { _state.panX = x; _state.panY = y; emit('pan'); },
    setFlowName(n){ _state.flowName = n; },

    select(id, type = 'node') { _state.selectedId = id; _state.selectedType = type; emit('selection'); },
    deselect()                { _state.selectedId = null; _state.selectedType = null; emit('selection'); },

    _push() {
      _state.history.push(snapshot());
      if (_state.history.length > 80) _state.history.shift();
      _state.future = [];
    },
    nextId()     { return 'node_' + (_state._counter++); },
    nextEdgeId() { return 'edge_' + (_state._counter++); },

    addNode(node) { this._push(); _state.nodes.push(node); emit('nodes'); },
    updateNode(id, patch) {
      this._push();
      const n = AF.store.getNode(id); if (!n) return;
      Object.assign(n, patch);
      if (patch.props) Object.assign(n.props, patch.props);
      emit('nodes');
    },
    moveNode(id, x, y) {
      const n = AF.store.getNode(id); if (!n) return;
      n.x = x; n.y = y; emit('nodes');
    },
    deleteNode(id) {
      this._push();
      _state.nodes = _state.nodes.filter(n => n.id !== id);
      _state.edges = _state.edges.filter(e => e.source !== id && e.target !== id);
      if (_state.selectedId === id) AF.store.deselect();
      emit('nodes'); emit('edges');
    },

    addEdge(edge) {
      this._push();
      const exists = _state.edges.some(e => e.source === edge.source && e.target === edge.target);
      if (exists) return;
      _state.edges.push(edge); emit('edges');
    },
    updateEdge(id, patch) {
      this._push();
      const e = AF.store.getEdge(id); if (!e) return;
      Object.assign(e, patch); emit('edges');
    },
    deleteEdge(id) {
      this._push();
      _state.edges = _state.edges.filter(e => e.id !== id);
      if (_state.selectedId === id) AF.store.deselect();
      emit('edges');
    },

    undo() {
      if (!_state.history.length) return;
      _state.future.push(snapshot());
      const prev = _state.history.pop();
      _state.nodes = prev.nodes; _state.edges = prev.edges;
      AF.store.deselect(); emit('nodes'); emit('edges');
    },
    redo() {
      if (!_state.future.length) return;
      _state.history.push(snapshot());
      const next = _state.future.pop();
      _state.nodes = next.nodes; _state.edges = next.edges;
      AF.store.deselect(); emit('nodes'); emit('edges');
    },

    exportJSON() {
      return {
        schema: 'agent-flow/v1',
        metadata: { name: _state.flowName },
        nodes: _state.nodes,
        edges: _state.edges,
        runtime: { engine: 'agentcore' },
      };
    },
    importJSON(data) {
      this._push();
      _state.flowName = (data.metadata && data.metadata.name) || 'Imported Flow';
      _state.nodes = data.nodes || [];
      _state.edges = data.edges || [];
      const ids = _state.nodes.map(n => parseInt(n.id.replace('node_','')) || 0);
      _state._counter = (ids.length ? Math.max.apply(null, ids) : 0) + 1;
      AF.store.deselect();
      emit('nodes'); emit('edges'); emit('import');
    },

    on(event, fn) {
      _listeners.push({ event, fn });
      return function () { _listeners = _listeners.filter(l => l.fn !== fn); };
    },
  };
})();
