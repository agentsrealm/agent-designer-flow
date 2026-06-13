/* data/node-types.js — palette definitions, models, edge types, validation rules */
window.AF = window.AF || {};

AF.NODE_GROUPS = [
  {
    id: 'triggers', label: 'Triggers',
    items: [
      {
        type: 'start', label: 'Start', icon: '▶', category: 'start',
        defaultProps: { name: 'Start', trigger: 'chat', inputSchema: '', userContext: true, tenantContext: false },
        tabs: ['General', 'Input', 'Context']
      },
      {
        type: 'end', label: 'End', icon: '⏹', category: 'end',
        defaultProps: { name: 'End', outputSchema: '', returnFormat: 'json' },
        tabs: ['General', 'Output']
      },
    ],
  },
  {
    id: 'agents', label: 'Agents',
    items: [
      {
        type: 'agent', label: 'Agent', icon: '🤖', category: 'agent',
        defaultProps: { name: 'Agent', role: '', goal: '', instructions: '', model: 'claude-sonnet-4-6', temperature: 0.7, maxTokens: 4096, maxIterations: 10, timeout: 120, tools: [], knowledgeBases: [], memoryScope: 'session', fallbackAgent: '' },
        tabs: ['General', 'Prompt', 'Model', 'Tools', 'Memory', 'Guardrails']
      },
      {
        type: 'sub-agent', label: 'Sub-Agent', icon: '🔹', category: 'agent',
        defaultProps: { name: 'Sub-Agent', parentAgent: '', specialization: '', allowedTools: [], delegationRules: '', returnFormat: 'text' },
        tabs: ['General', 'Delegation', 'Tools']
      },
      {
        type: 'supervisor', label: 'Supervisor Agent', icon: '👁', category: 'agent',
        defaultProps: { name: 'Supervisor', role: 'supervisor', managedAgents: [], coordinationStrategy: 'sequential', model: 'claude-opus-4-8' },
        tabs: ['General', 'Coordination', 'Agents']
      },
      {
        type: 'router', label: 'Router Agent', icon: '↗', category: 'agent',
        defaultProps: { name: 'Router', routingStrategy: 'intent', confidenceThreshold: 0.75, model: 'claude-haiku-4-5-20251001', routes: [], fallbackRoute: '' },
        tabs: ['General', 'Routes', 'Model']
      },
      {
        type: 'evaluator', label: 'Evaluator Agent', icon: '⚖', category: 'agent',
        defaultProps: { name: 'Evaluator', criteria: '', scoreThreshold: 0.8, model: 'claude-sonnet-4-6', outputKey: 'evaluation' },
        tabs: ['General', 'Criteria', 'Model']
      },
      {
        type: 'planner', label: 'Planner Agent', icon: '📋', category: 'agent',
        defaultProps: { name: 'Planner', planningStrategy: 'step-by-step', model: 'claude-opus-4-8', maxSteps: 10 },
        tabs: ['General', 'Planning', 'Model']
      },
      {
        type: 'executor', label: 'Executor Agent', icon: '⚡', category: 'agent',
        defaultProps: { name: 'Executor', executionMode: 'sequential', retryPolicy: 'exponential', maxRetries: 3 },
        tabs: ['General', 'Execution', 'Retry']
      },
      {
        type: 'critic', label: 'Critic Agent', icon: '🔎', category: 'agent',
        defaultProps: { name: 'Critic', critiqueFocus: '', model: 'claude-sonnet-4-6', outputKey: 'critique' },
        tabs: ['General', 'Critique', 'Model']
      },
    ],
  },
  {
    id: 'work', label: 'Work Items',
    items: [
      {
        type: 'tool-task', label: 'Tool Task', icon: '🔧', category: 'work',
        defaultProps: { name: 'Tool Task', toolId: '', toolName: '', toolDisplayName: '', toolDescription: '', pluginId: '', pluginName: '', endpoint: '', auth: 'none' },
        tabs: ['Select Tool']
      },
      {
        type: 'mock-task', label: 'Mock Task', icon: '⚠️', category: 'work',
        defaultProps: { name: 'Mock Task', toolId: '', toolName: '', toolDisplayName: '', toolDescription: '', pluginId: '', pluginName: '', endpoint: '', auth: 'none' },
        tabs: ['Select Mock Tool']
      },
      {
        type: 'skill', label: 'Skill', icon: '♻', category: 'work',
        defaultProps: { name: 'Skill', skillId: '', skillName: '', skillDisplayName: '', skillDescription: '', version: '1.0', category: '', parameters: '', inputVars: [], outputVars: [], outputKey: 'result' },
        tabs: ['Select Skill']
      },
      {
        type: 'subflow', label: 'Subflow', icon: '📦', category: 'work',
        defaultProps: { name: 'Subflow', subflowId: '', subflowName: '', subflowDisplayName: '', subflowDescription: '', flowRef: '', flowId: '', version: '1.0', inputMapping: '', outputMapping: '', async: false, outputKey: 'result' },
        tabs: ['Select Subflow']
      },
      {
        type: 'agent', label: 'Agent', icon: '🤖', category: 'work',
        defaultProps: { name: 'Agent', agentRefId: '', agentRefName: '', agentDisplayName: '', agentDescription: '', role: '', model: '', agentType: '', instructions: '', temperature: 0.7, maxTokens: 4096, maxIterations: 10, timeout: 120, tools: [], knowledgeBases: [], memoryScope: 'session', fallbackAgent: '' },
        tabs: ['Select Agent']
      },
      {
        type: 'human-approval', label: 'Human Approval', icon: '👤', category: 'work',
        defaultProps: { name: 'Human Approval', approverRole: '', approvalQuestion: '', timeout: 3600, escalationPath: '', allowEdit: false },
        tabs: ['General', 'Approver', 'Timeout']
      },
      {
        type: 'notification', label: 'Notification', icon: '🔔', category: 'work',
        defaultProps: { name: 'Notification', channel: 'slack', recipient: '', message: '', onSuccess: true, onFailure: true },
        tabs: ['General', 'Message']
      },
    ],
  },
  {
    id: 'control', label: 'Control Flow',
    items: [
      {
        type: 'decision', label: 'Decision / Router', icon: '⑂', category: 'control',
        defaultProps: { name: 'Decision', condition: '', conditionType: 'expression', branches: [{ label: 'True', condition: '' }, { label: 'False', condition: '' }], fallbackBranch: 'False' },
        tabs: ['General', 'Branches']
      },
      {
        type: 'loop', label: 'Loop', icon: '↺', category: 'control',
        defaultProps: { name: 'Loop', loopType: 'for-each', iterateOver: '', exitCondition: '', maxIterations: 50, breakOnError: true },
        tabs: ['General', 'Condition']
      },
      {
        type: 'parallel', label: 'Parallel Execution', icon: '⫸', category: 'control',
        defaultProps: { name: 'Parallel', branches: 2, waitForAll: true, timeout: 120 },
        tabs: ['General', 'Branches']
      },
      {
        type: 'merge', label: 'Merge', icon: '⫷', category: 'control',
        defaultProps: { name: 'Merge', mergeStrategy: 'all', outputKey: 'merged' },
        tabs: ['General', 'Strategy']
      },
    ],
  },
];

AF.MODEL_OPTIONS = [
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (Most capable)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanced)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fast)' },
  { value: 'claude-fable-5', label: 'Claude Fable 5 (Creative)' },
];

AF.EDGE_TYPES = [
  { value: 'control', label: 'Control Flow', css: 'edge-control', dash: false },
  { value: 'data', label: 'Data Flow', css: 'edge-data', dash: true },
  { value: 'delegate', label: 'Delegation', css: 'edge-delegate', dash: false },
  { value: 'tool', label: 'Tool Access', css: 'edge-tool', dash: true },
  { value: 'approval', label: 'Approval Flow', css: 'edge-approval', dash: false },
  { value: 'fallback', label: 'Fallback', css: 'edge-fallback', dash: true },
];
