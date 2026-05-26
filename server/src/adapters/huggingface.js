export async function runHuggingFace({ model, messages, temperature, maxTokens, responseFormat }) {
  const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HF_TOKEN || ""}`
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
    throw new Error(data?.error?.message || data?.error || "Hugging Face request failed");
  }

  return {
    text: data.choices?.[0]?.message?.content || "",
    raw: data
  };
}
