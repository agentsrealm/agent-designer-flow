/* data/agents-catalog.mock.js — inline mock agents (works without HTTP server) */
window.AF = window.AF || {};

AF.MOCK_AGENTS_CATALOG = {
  "schema": "agent-agents/v1",
  "source": "mock",
  "updatedAt": "2026-06-12T00:00:00Z",
  "agents": [
    {
      "id": "agent_billing",
      "name": "billing-agent",
      "displayName": "Billing Agent",
      "description": "Handles invoices, refunds, and subscription changes.",
      "role": "Billing Specialist",
      "model": "claude-sonnet-4-6",
      "agentType": "specialist"
    },
    {
      "id": "agent_support",
      "name": "support-agent",
      "displayName": "Support Agent",
      "description": "Resolves technical issues using docs and tickets.",
      "role": "Technical Support",
      "model": "claude-sonnet-4-6",
      "agentType": "specialist"
    },
    {
      "id": "agent_research",
      "name": "research-agent",
      "displayName": "Research Agent",
      "description": "Gathers and synthesizes information from multiple sources.",
      "role": "Research Analyst",
      "model": "claude-opus-4-8",
      "agentType": "research"
    },
    {
      "id": "agent_router",
      "name": "intent-router",
      "displayName": "Intent Router",
      "description": "Routes conversations to the best downstream agent.",
      "role": "Router",
      "model": "claude-haiku-4-5-20251001",
      "agentType": "router"
    },
    {
      "id": "agent_sales",
      "name": "sales-agent",
      "displayName": "Sales Agent",
      "description": "Qualifies leads and drafts follow-up outreach.",
      "role": "Sales Associate",
      "model": "claude-sonnet-4-6",
      "agentType": "specialist"
    },
    {
      "id": "agent_hr",
      "name": "hr-agent",
      "displayName": "HR Agent",
      "description": "Answers policy questions and guides HR workflows.",
      "role": "HR Partner",
      "model": "claude-sonnet-4-6",
      "agentType": "specialist"
    },
    {
      "id": "agent_security",
      "name": "security-agent",
      "displayName": "Security Agent",
      "description": "Triages alerts and recommends remediation steps.",
      "role": "Security Analyst",
      "model": "claude-opus-4-8",
      "agentType": "specialist"
    },
    {
      "id": "agent_data",
      "name": "data-agent",
      "displayName": "Data Agent",
      "description": "Runs analytics queries and explains results.",
      "role": "Data Analyst",
      "model": "claude-sonnet-4-6",
      "agentType": "specialist"
    },
    {
      "id": "agent_supervisor",
      "name": "supervisor-agent",
      "displayName": "Supervisor Agent",
      "description": "Coordinates multiple agents and merges outputs.",
      "role": "Supervisor",
      "model": "claude-opus-4-8",
      "agentType": "supervisor"
    },
    {
      "id": "agent_critic",
      "name": "critic-agent",
      "displayName": "Critic Agent",
      "description": "Reviews agent outputs for quality and safety.",
      "role": "Quality Critic",
      "model": "claude-sonnet-4-6",
      "agentType": "critic"
    },
    {
      "id": "agent_planner",
      "name": "planner-agent",
      "displayName": "Planner Agent",
      "description": "Creates multi-step execution plans for complex goals.",
      "role": "Planner",
      "model": "claude-opus-4-8",
      "agentType": "planner"
    },
    {
      "id": "agent_onboarding",
      "name": "onboarding-agent",
      "displayName": "Onboarding Agent",
      "description": "Guides new users through product setup.",
      "role": "Onboarding Guide",
      "model": "claude-haiku-4-5-20251001",
      "agentType": "specialist"
    },
    {
      "id": "agent_compliance",
      "name": "compliance-agent",
      "displayName": "Compliance Agent",
      "description": "Checks actions against regulatory requirements.",
      "role": "Compliance Officer",
      "model": "claude-sonnet-4-6",
      "agentType": "specialist"
    },
    {
      "id": "agent_devops",
      "name": "devops-agent",
      "displayName": "DevOps Agent",
      "description": "Assists with CI/CD, infra changes, and incidents.",
      "role": "DevOps Engineer",
      "model": "claude-sonnet-4-6",
      "agentType": "specialist"
    },
    {
      "id": "agent_knowledge",
      "name": "knowledge-agent",
      "displayName": "Knowledge Agent",
      "description": "Retrieves answers from enterprise knowledge bases.",
      "role": "Knowledge Curator",
      "model": "claude-sonnet-4-6",
      "agentType": "rag"
    },
    {
      "id": "agent_executive",
      "name": "executive-agent",
      "displayName": "Executive Briefing Agent",
      "description": "Produces concise executive summaries from reports.",
      "role": "Executive Assistant",
      "model": "claude-opus-4-8",
      "agentType": "specialist"
    },
    {
      "id": "agent_localization",
      "name": "localization-agent",
      "displayName": "Localization Agent",
      "description": "Adapts content for regional language and tone.",
      "role": "Localization Specialist",
      "model": "claude-sonnet-4-6",
      "agentType": "specialist"
    },
    {
      "id": "agent_escalation",
      "name": "escalation-agent",
      "displayName": "Escalation Agent",
      "description": "Handles high-priority cases requiring human handoff.",
      "role": "Escalation Manager",
      "model": "claude-sonnet-4-6",
      "agentType": "specialist"
    }
  ]
};
