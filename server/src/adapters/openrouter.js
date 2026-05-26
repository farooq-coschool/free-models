export async function runOpenRouter({ model, messages, temperature, maxTokens, responseFormat }) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Edu Model Console"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens || undefined,
      response_format: responseFormat === "json" ? { type: "json_object" } : undefined
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || "OpenRouter request failed");
  }

  return {
    text: data.choices?.[0]?.message?.content || "",
    raw: data
  };
}
