function normalizeMessages(messages = []) {
  const systemMessage = messages.find((message) => message.role === "system")?.content || "";
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.content || "") }]
    }));

  return { systemMessage, contents };
}

export async function runGoogle({ model, messages, temperature, maxTokens, responseFormat }) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY for gemma4:31b");
  }

  const googleModel = process.env.GOOGLE_MODEL_FOR_GEMMA4 || "gemini-2.5-flash";
  const { systemMessage, contents } = normalizeMessages(messages);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(googleModel)}:generateContent`;

  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens || undefined,
      responseMimeType: responseFormat === "json" ? "application/json" : "text/plain"
    }
  };

  if (systemMessage) {
    body.systemInstruction = {
      parts: [{ text: systemMessage }]
    };
  }

  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("Cannot reach Google Gemini API right now.");
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || `Google Gemini request failed with ${res.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || "";

  return {
    text,
    raw: data
  };
}
