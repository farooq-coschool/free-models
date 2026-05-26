const ROUTER_RULES = [
  {
    taskType: "lesson_plan",
    preferredTags: ["lesson_explanation", "curriculum_mapping"],
    wantsJson: false,
    fallbackOrder: ["ollama"]
  },
  {
    taskType: "worksheet",
    preferredTags: ["rubric_creation", "mcq_generation"],
    wantsJson: false,
    fallbackOrder: ["ollama"]
  },
  {
    taskType: "mcq_json",
    preferredTags: ["mcq_generation", "schema_validity"],
    wantsJson: true,
    fallbackOrder: ["ollama"]
  },
  {
    taskType: "research_brief",
    preferredTags: ["deep_research_summary", "citation_synthesis"],
    wantsJson: false,
    fallbackOrder: ["ollama"]
  }
];

function scoreModel(model, rule) {
  let score = 0;
  const tags = model.bestFor || [];
  score += tags.filter((tag) => rule.preferredTags.includes(tag)).length * 3;
  if (rule.wantsJson && model.supportsJson) score += 2;
  if (model.isFree) score += 1;
  if (model.supportsLongContext) score += 1;
  if (model.status === "online") score += 1;
  return score;
}

export function routeTask({ taskType, models = [], prompt = "", wantsJson = false, rulesOnly = false }) {
  if (rulesOnly) {
    return ROUTER_RULES;
  }

  const rule = ROUTER_RULES.find((item) => item.taskType === taskType) || ROUTER_RULES[0];
  const scored = [...models]
    .map((model) => ({ ...model, score: scoreModel(model, { ...rule, wantsJson: wantsJson || rule.wantsJson }) }))
    .sort((a, b) => b.score - a.score);

  const chosen = scored[0] || null;
  const providerFallback = rule.fallbackOrder[0];

  return {
    taskType: rule.taskType,
    wantsJson: wantsJson || rule.wantsJson,
    promptPreview: String(prompt || "").slice(0, 120),
    recommendedModel: chosen,
    fallbackProvider: providerFallback,
    candidates: scored.slice(0, 5),
    reasoning: chosen
      ? `Selected ${chosen.id} because it best matches the task tags and capability flags.`
      : `No registered model was provided, so the router would fall back to ${providerFallback}.`
  };
}
