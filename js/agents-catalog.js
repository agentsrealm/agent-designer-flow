/* js/agents-catalog.js — runtime agent list for work-item Agent nodes */
window.AF = window.AF || {};

(function () {
  AF.agentsCatalog = AF.createRuntimeCatalog({
    schema: 'agent-agents/v1',
    itemsKey: 'agents',
    mockInline: 'MOCK_AGENTS_CATALOG',
    mockUrl: 'data/agents-catalog.mock.json',
    requestMessage: 'FLOW_REQUEST_AGENTS',
    readyEvent: 'af-agents-catalog-ready',
    updatedEvent: 'af-agents-catalog-updated',
    normalizeItem: function (t) {
      return {
        id: t.id || t.name,
        name: t.name || t.id,
        displayName: t.displayName || t.name || t.id,
        description: t.description || '',
        role: t.role || '',
        model: t.model || '',
        agentType: t.agentType || '',
      };
    },
    propsFromItem: function (agent) {
      if (!agent) return {};
      return {
        agentRefId: agent.id,
        agentRefName: agent.name,
        agentDisplayName: agent.displayName,
        agentDescription: agent.description,
        role: agent.role || '',
        model: agent.model || '',
        agentType: agent.agentType || '',
        name: agent.displayName || agent.name,
      };
    },
  });
})();
