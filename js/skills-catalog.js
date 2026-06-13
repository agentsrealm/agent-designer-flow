/* js/skills-catalog.js — runtime skill list (mock + Angular host via postMessage) */
window.AF = window.AF || {};

(function () {
  AF.skillsCatalog = AF.createRuntimeCatalog({
    schema: 'agent-skills/v1',
    itemsKey: 'skills',
    mockInline: 'MOCK_SKILLS_CATALOG',
    mockUrl: 'data/skills-catalog.mock.json',
    requestMessage: 'FLOW_REQUEST_SKILLS',
    readyEvent: 'af-skills-catalog-ready',
    updatedEvent: 'af-skills-catalog-updated',
    normalizeItem: function (t) {
      return {
        id: t.id || t.name,
        name: t.name || t.id,
        displayName: t.displayName || t.name || t.id,
        description: t.description || '',
        version: t.version || '1.0',
        category: t.category || '',
      };
    },
    propsFromItem: function (skill) {
      if (!skill) return {};
      return {
        skillId: skill.id,
        skillName: skill.name,
        skillDisplayName: skill.displayName,
        skillDescription: skill.description,
        version: skill.version || '1.0',
        category: skill.category || '',
        name: skill.displayName || skill.name,
      };
    },
  });
})();
