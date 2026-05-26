export function isJsonLike(text) {
  if (!text || typeof text !== "string") return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function countDuplicateItems(items) {
  const seen = new Set();
  let duplicates = 0;
  for (const item of items) {
    const key = typeof item === "string" ? item.trim().toLowerCase() : JSON.stringify(item);
    if (seen.has(key)) {
      duplicates += 1;
    } else {
      seen.add(key);
    }
  }
  return duplicates;
}

function gradeFromPrompt(prompt) {
  const match = String(prompt || "").match(/\b(class|grade)\s*(\d+)\b/i);
  return match ? Number(match[2]) : null;
}

export function evaluateResponse({ responseText, expectedType = "text", expectedSchema, prompt = "", benchmark = null }) {
  const parsed = safeParseJson(responseText);
  const schemaValid = expectedType === "json" ? parsed !== null : expectedType === "text" ? true : parsed !== null;

  const checks = {
    validJson: parsed !== null,
    hasAnswerKey:
      typeof responseText === "string" &&
      /answer key|answers?:|correct answer/i.test(responseText),
    hasDuplicates: false,
    gradeFit: true,
    schemaMatch: true
  };

  let duplicatePenalty = 0;
  if (Array.isArray(parsed?.questions)) {
    const duplicateCount = countDuplicateItems(parsed.questions.map((item) => item.prompt || item.question || item.text || item));
    checks.hasDuplicates = duplicateCount > 0;
    duplicatePenalty = Math.min(duplicateCount, 3);
  }

  const promptGrade = gradeFromPrompt(prompt);
  if (benchmark?.gradeLevel && promptGrade) {
    checks.gradeFit = Math.abs(Number(benchmark.gradeLevel) - promptGrade) <= 2;
  }

  if (expectedSchema && parsed) {
    checks.schemaMatch = Object.keys(expectedSchema).every((key) => Object.hasOwn(parsed, key));
  }

  const clarityBase = Math.min(10, Math.max(4, Math.round((String(responseText).length / 120) + 4)));
  const pedagogyScore = Math.min(10, checks.hasAnswerKey ? 9 : 7);
  const factualityScore = Math.min(10, checks.validJson ? 8 : 6);
  const schemaScore = schemaValid ? 10 : 2;
  const structureScore = checks.schemaMatch ? 9 : 5;
  const overall = Number(
    (
      (schemaScore + clarityBase + pedagogyScore + factualityScore + structureScore - duplicatePenalty) /
      5
    ).toFixed(1)
  );

  return {
    schemaValid,
    checks,
    scores: {
      schemaScore,
      clarityScore: clarityBase,
      pedagogyScore,
      factualityScore,
      structureScore,
      duplicationPenalty: duplicatePenalty ? -duplicatePenalty : 0,
      overall
    },
    notes: [
      schemaValid ? "Response matched the expected format." : "Response did not match the expected format.",
      duplicatePenalty ? "Duplicate items detected in structured output." : "No duplicates detected in structured output."
    ]
  };
}
