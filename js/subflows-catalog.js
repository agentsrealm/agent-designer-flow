/* js/subflows-catalog.js — runtime subflow list (mock + Angular host via postMessage) */
window.AF = window.AF || {};

(function () {
  AF.subflowsCatalog = AF.createRuntimeCatalog({
    schema: 'agent-subflows/v1',
    itemsKey: 'subflows',
    mockInline: 'MOCK_SUBFLOWS_CATALOG',
    mockUrl: 'data/subflows-catalog.mock.json',
    requestMessage: 'FLOW_REQUEST_SUBFLOWS',
    readyEvent: 'af-subflows-catalog-ready',
    updatedEvent: 'af-subflows-catalog-updated',
    normalizeItem: function (t) {
      return {
        id: t.id || t.name,
        name: t.name || t.id,
        displayName: t.displayName || t.name || t.id,
        description: t.description || '',
        version: t.version || '1.0',
        nodeCount: t.nodeCount || (t.flow && t.flow.nodes ? t.flow.nodes.length : 0),
        flow: t.flow || null,
      };
    },
    propsFromItem: function (sf) {
      if (!sf) return {};
      return {
        subflowId: sf.id,
        subflowName: sf.name,
        subflowDisplayName: sf.displayName,
        subflowDescription: sf.description,
        flowId: sf.id,
        flowRef: sf.name,
        version: sf.version || '1.0',
        name: sf.displayName || sf.name,
        async: false,
        outputKey: 'result',
        inputMapping: '',
        outputMapping: '',
      };
    },
  });

  AF.subflowsCatalog.getFlow = function (id) {
    var item = AF.subflowsCatalog.findById(id);
    return item && item.flow ? JSON.parse(JSON.stringify(item.flow)) : null;
  };
})();
