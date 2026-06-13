/* js/tools-catalog.js — runtime tool list (mock + Angular host via postMessage) */
window.AF = window.AF || {};

(function () {
  AF.toolsCatalog = AF.createRuntimeCatalog({
    schema: 'agent-tools/v1',
    itemsKey: 'tools',
    mockInline: 'MOCK_TOOLS_CATALOG',
    mockUrl: 'data/tools-catalog.mock.json',
    requestMessage: 'FLOW_REQUEST_TOOLS',
    readyEvent: 'af-tools-catalog-ready',
    updatedEvent: 'af-tools-catalog-updated',
    normalizeItem: function (t) {
      return {
        id: t.id || t.name,
        name: t.name || t.id,
        displayName: t.displayName || t.name || t.id,
        description: t.description || '',
        pluginId: t.pluginId || '',
        pluginName: t.pluginName || '',
        category: t.category || '',
        auth: t.auth || 'none',
        endpoint: t.endpoint || '',
      };
    },
    propsFromItem: function (tool) {
      if (!tool) return {};
      return {
        toolId: tool.id,
        toolName: tool.name,
        toolDisplayName: tool.displayName,
        toolDescription: tool.description,
        pluginId: tool.pluginId,
        pluginName: tool.pluginName,
        endpoint: tool.endpoint || '',
        auth: tool.auth || 'none',
        name: tool.displayName || tool.name,
      };
    },
  });

  AF.toolsCatalog.propsFromTool = AF.toolsCatalog.propsFromItem;
})();
