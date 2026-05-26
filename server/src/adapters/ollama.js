export async function runOllama({ model, messages, temperature, maxTokens, responseFormat }) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  let res;

  try {
    res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens || undefined,
        response_format: responseFormat === "json" ? { type: "json_object" } : undefined
      })
    });
  } catch (error) {
    throw new Error(
      `Cannot reach Ollama at ${baseUrl}. Make sure Ollama is running on the host and listening on 11434.`
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || `Ollama request failed with ${res.status}`);
  }

  return {
    text: data.choices?.[0]?.message?.content || "",
    raw: data
  };
}
