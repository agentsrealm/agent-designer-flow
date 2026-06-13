/* js/mock-tools-catalog.js — runtime catalog for Mock Task nodes */
window.AF = window.AF || {};

(function () {
  AF.mockToolsCatalog = AF.createRuntimeCatalog({
    schema: 'mock-tools/v1',
    itemsKey: 'tools',
    mockInline: 'MOCK_MOCK_TOOLS_CATALOG',
    mockUrl: 'data/mock-tools-catalog.mock.json',
    requestMessage: 'FLOW_REQUEST_MOCK_TOOLS',
    readyEvent: 'af-mock-tools-catalog-ready',
    updatedEvent: 'af-mock-tools-catalog-updated',
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
})();
