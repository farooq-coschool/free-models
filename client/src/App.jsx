import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { api } from "./lib/api";

const STORAGE_KEY = "ai_console_chats_v2";
const DEFAULT_PROMPT = "How can I help you today?";
const DEFAULT_ACTION_ID = "chat";

const ACTIONS = [
  { id: "chat", label: "Code", icon: "</>", placeholder: "Ask me to write, explain, or debug code." },
  { id: "create", label: "Create", icon: "+", placeholder: "Ask for a draft, plan, or polished content." },
  { id: "strategize", label: "Strategize", icon: "[]", placeholder: "Ask for analysis, planning, or tradeoffs." },
  { id: "write", label: "Write", icon: "P", placeholder: "Ask for emails, posts, summaries, or docs." },
  { id: "learn", label: "Learn", icon: "?", placeholder: "Ask for explanations, comparisons, or lessons." }
];

const ACTION_RULES = {
  chat: { systemPrompt: "You are a helpful coding assistant.", responseFormat: "text" },
  create: { systemPrompt: "You are a creative content assistant.", responseFormat: "text" },
  strategize: { systemPrompt: "You are an analytical planning assistant.", responseFormat: "text" },
  write: { systemPrompt: "You are a polished writing assistant.", responseFormat: "text" },
  learn: { systemPrompt: "You are a clear teaching assistant.", responseFormat: "text" }
};

function buildChat({ prompt = "", modelId = "", actionId = DEFAULT_ACTION_ID, response = "", temperature = 0.4, maxTokens = 4096, responseFormat = "text", attachments = [] } = {}) {
  const now = new Date().toISOString();
  return {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: prompt.trim().slice(0, 42) || "New chat",
    prompt,
    modelId,
    actionId,
    response,
    temperature,
    maxTokens,
    responseFormat,
    attachments,
    createdAt: now,
    updatedAt: now,
    status: response ? "done" : "draft"
  };
}

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const chats = raw ? JSON.parse(raw) : [];
    return Array.isArray(chats) ? chats : [];
  } catch {
    return [];
  }
}

function saveChats(chats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function Metric({ label, value }) {
  return (
    <div className="metric-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function App() {
  const [models, setModels] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [selectedActionId, setSelectedActionId] = useState(DEFAULT_ACTION_ID);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [temperature, setTemperature] = useState(0.4);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [responseFormat, setResponseFormat] = useState("text");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Ready");
  const [output, setOutput] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const imageInputRef = useRef(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.models(), api.runs()])
      .then(([modelData]) => {
        setModels(modelData);
        const savedChats = loadChats();
        const defaultModelId = modelData.find((model) => model.provider === "ollama")?.id || modelData[0]?.id || "";

        if (savedChats.length > 0) {
          setChats(savedChats);
          const active = savedChats[0];
          setActiveChatId(active.id);
          setPrompt(active.prompt || DEFAULT_PROMPT);
          setSelectedActionId(active.actionId || DEFAULT_ACTION_ID);
          setSelectedModelId(modelData.some((model) => model.id === active.modelId) ? active.modelId : defaultModelId);
          setTemperature(active.temperature ?? 0.4);
          setMaxTokens(active.maxTokens ?? 4096);
          setResponseFormat(active.responseFormat || "text");
          setAttachments(active.attachments || []);
          setOutput(active.response || "");
        } else {
          const freshChat = buildChat({ modelId: defaultModelId, maxTokens: 4096 });
          setChats([freshChat]);
          setActiveChatId(freshChat.id);
          setSelectedModelId(defaultModelId);
        }
      })
      .catch((error) => setStatusText(error.message));
  }, []);

  useEffect(() => {
    if (chats.length) {
      saveChats(chats);
    }
  }, [chats]);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) || null,
    [models, selectedModelId]
  );

  const selectedAction = useMemo(
    () => ACTIONS.find((action) => action.id === selectedActionId) || ACTIONS[0],
    [selectedActionId]
  );

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || null,
    [chats, activeChatId]
  );

  const tokenCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;

  function updateActiveChat(patch) {
    if (!activeChatId) return;
    setChats((current) =>
      current.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              ...patch,
              updatedAt: new Date().toISOString()
            }
          : chat
      )
    );
  }

  function createNewChat() {
    const defaultModelId = models.find((model) => model.provider === "ollama")?.id || models[0]?.id || "";
    const chat = buildChat({ modelId: defaultModelId, maxTokens: 4096 });
    setChats((current) => [chat, ...current]);
    setActiveChatId(chat.id);
    setPrompt(DEFAULT_PROMPT);
    setSelectedActionId(DEFAULT_ACTION_ID);
    setSelectedModelId(defaultModelId);
    setTemperature(0.4);
    setMaxTokens(4096);
    setResponseFormat("text");
    setAttachments([]);
    setOutput("");
    setFileInputKey((value) => value + 1);
    setStatusText("New chat created.");
  }

  function selectChat(chatId) {
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) return;
    const safeModelId = models.some((model) => model.id === chat.modelId)
      ? chat.modelId
      : models.find((model) => model.provider === "ollama")?.id || models[0]?.id || "";
    setActiveChatId(chat.id);
    setPrompt(chat.prompt || DEFAULT_PROMPT);
    setSelectedActionId(chat.actionId || DEFAULT_ACTION_ID);
    setSelectedModelId(safeModelId || selectedModelId);
    setTemperature(chat.temperature ?? 0.4);
    setMaxTokens(chat.maxTokens ?? 4096);
    setResponseFormat(chat.responseFormat || "text");
    setAttachments(chat.attachments || []);
    setOutput(chat.response || "");
    setStatusText("Chat loaded.");
  }

  function deleteChat(chatId) {
    setChats((current) => {
      const next = current.filter((chat) => chat.id !== chatId);
      if (activeChatId === chatId) {
        const fallback = next[0] || null;
        if (fallback) {
          setTimeout(() => selectChat(fallback.id), 0);
        } else {
          setActiveChatId(null);
          setPrompt(DEFAULT_PROMPT);
          setSelectedActionId(DEFAULT_ACTION_ID);
          setAttachments([]);
          setOutput("");
          setStatusText("Chat deleted.");
        }
      }
      return next;
    });
  }

  function chooseAction(actionId) {
    const nextAction = ACTIONS.find((action) => action.id === actionId) || ACTIONS[0];
    setSelectedActionId(nextAction.id);
    setPrompt(nextAction.placeholder);
    if (selectedModel?.supportsJson && nextAction.id === "chat") {
      setResponseFormat("text");
    }
    updateActiveChat({
      actionId: nextAction.id,
      prompt: nextAction.placeholder
    });
  }

  async function handleAttachFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const nextAttachments = [];

    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isText = file.type.startsWith("text/") || /\.(txt|md|csv|json|js|jsx|ts|tsx|py|html|css|log)$/i.test(file.name);

      if (isImage) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
          reader.readAsDataURL(file);
        });

        nextAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "image",
          name: file.name,
          mimeType: file.type,
          size: file.size,
          previewUrl: dataUrl
        });
      } else if (isText) {
        const text = await file.text();
        nextAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "text",
          name: file.name,
          mimeType: file.type || "text/plain",
          size: file.size,
          text
        });
      } else {
        nextAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "file",
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          note: "Unsupported preview type"
        });
      }
    }

    setAttachments((current) => {
      const next = [...current, ...nextAttachments];
      updateActiveChat({ attachments: next });
      return next;
    });
    setFileInputKey((value) => value + 1);
    setStatusText(`${nextAttachments.length} file(s) attached.`);
  }

  function openImageAttach() {
    imageInputRef.current?.click();
  }

  function removeAttachment(attachmentId) {
    setAttachments((current) => {
      const next = current.filter((item) => item.id !== attachmentId);
      updateActiveChat({ attachments: next });
      return next;
    });
  }

  async function runPrompt() {
    if (!selectedModel) {
      setStatusText("Choose a model first.");
      return;
    }

    if (!prompt.trim()) {
      setStatusText("Write a prompt first.");
      return;
    }

    const actionRule = ACTION_RULES[selectedActionId] || ACTION_RULES.chat;
    const attachmentContext = attachments
      .map((attachment) =>
        attachment.type === "text"
          ? `\n\n[Attached file: ${attachment.name}]\n${attachment.text}`
          : `\n\n[Attached image: ${attachment.name}]`
      )
      .join("");
    const fullPrompt = `${prompt}${attachmentContext}`;
    setLoading(true);
    setStatusText("Running prompt...");

    try {
      const run = await api.run({
        provider: selectedModel.provider,
        model: selectedModel.model,
        messages: [
          { role: "system", content: actionRule.systemPrompt },
          { role: "user", content: fullPrompt }
        ],
        temperature,
        maxTokens,
        responseFormat,
        prompt: fullPrompt
      });

      setOutput(run.response || "");
      setStatusText("Done.");

      const updatedChat = activeChat
        ? {
            ...activeChat,
            title: prompt.trim().slice(0, 42) || activeChat.title,
            prompt,
            modelId: selectedModelId,
            actionId: selectedActionId,
            temperature,
            maxTokens,
            responseFormat,
            attachments,
            response: run.response || "",
            status: "done",
            updatedAt: new Date().toISOString()
          }
        : buildChat({
            prompt,
            modelId: selectedModelId,
            actionId: selectedActionId,
            response: run.response || "",
            temperature,
            maxTokens,
            responseFormat,
            attachments
          });

      setChats((current) => {
        const exists = current.some((chat) => chat.id === updatedChat.id);
        const next = exists
          ? current.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
          : [updatedChat, ...current];
        return next;
      });
      setActiveChatId(updatedChat.id);
    } catch (error) {
      setStatusText(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    if (!output.trim()) {
      setStatusText("Nothing to copy yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      setStatusText("Output copied.");
    } catch {
      setStatusText("Copy failed.");
    }
  }

  function downloadOutput() {
    if (!output.trim()) {
      setStatusText("Nothing to download yet.");
      return;
    }
    setDownloadMenuOpen((value) => !value);
  }

  function safeTitle() {
    return (activeChat?.title || "output").replace(/[^\w\-]+/g, "_").slice(0, 48) || "output";
  }

  function triggerDownload(blob, extension) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle()}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsv() {
    const header = ["title", "model", "action", "prompt", "response", "temperature", "maxTokens"];
    const rows = [
      [
        activeChat?.title || "",
        selectedModel?.id || "",
        selectedAction?.label || "",
        prompt || "",
        output || "",
        String(temperature),
        String(maxTokens)
      ]
    ];

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), "csv");
    setDownloadMenuOpen(false);
    setStatusText("CSV download started.");
  }

  function downloadPdf() {
    (async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const margin = 50;
      let y = 740;
      const width = 512;
      const drawLine = (text, size = 12, useBold = false) => {
        const fontRef = useBold ? boldFont : font;
        const words = String(text || "").split(/\s+/);
        let line = "";
        const lines = [];

        for (const word of words) {
          const next = line ? `${line} ${word}` : word;
          if (fontRef.widthOfTextAtSize(next, size) > width) {
            if (line) lines.push(line);
            line = word;
          } else {
            line = next;
          }
        }

        if (line) lines.push(line);
        if (!lines.length) lines.push("");

        for (const currentLine of lines) {
            page.drawText(currentLine, {
              x: margin,
              y,
              size,
              font: fontRef,
              color: rgb(0, 0, 0)
            });
            y -= size + 6;
          }
        };

      drawLine(activeChat?.title || "Output", 18, true);
      y -= 10;
      for (const line of String(output || "").split(/\r?\n/)) {
        drawLine(line, 12, false);
      }

      const bytes = await pdfDoc.save();
      triggerDownload(new Blob([bytes], { type: "application/pdf" }), "pdf");
      setDownloadMenuOpen(false);
      setStatusText("PDF download started.");
    })().catch(() => {
      setStatusText("PDF export failed.");
    });
  }

  async function downloadDocx() {
    const doc = new Document({
      sections: [
        {
            children: [
              new Paragraph({
                children: [new TextRun({ text: activeChat?.title || "Output", bold: true, size: 28, color: "000000" })]
              }),
              new Paragraph(""),
              ...String(output || "")
                .split(/\r?\n/)
                .map((line) => new Paragraph({ children: [new TextRun({ text: line, color: "000000" })] }))
            ]
          }
        ]
    });

    const blob = await Packer.toBlob(doc);
    triggerDownload(blob, "docx");
    setDownloadMenuOpen(false);
    setStatusText("DOCX download started.");
  }

  const activeCount = chats.length;

  return (
    <div className="claude-shell">
      <aside className="claude-sidebar">
        <div className="sidebar-top">
          <div className="brand">Console</div>
          <button className="sidebar-icon" aria-label="Toggle sidebar">
            []
          </button>
        </div>

        <button className="sidebar-primary" onClick={createNewChat}>
          + New chat
        </button>

        <nav className="sidebar-nav">
          <button className="nav-item active">Chats</button>
          <button className="nav-item muted-item">Customize</button>
        </nav>

        <div className="recent-header">
          Chats <span className="recent-count">{activeCount}</span>
        </div>

        <div className="recent-list">
          {chats.length === 0 ? (
            <div className="recent-empty">No chats yet</div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className={chat.id === activeChatId ? "recent-item active" : "recent-item"}>
                <button className="recent-title" onClick={() => selectChat(chat.id)}>
                  <span>{chat.title}</span>
                  <small>{chat.response ? "Completed" : "Draft"}</small>
                </button>
                <button className="delete-chat" onClick={() => deleteChat(chat.id)} aria-label="Delete chat">
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="avatar">F</div>
          <div className="footer-meta">
            <strong>Farooq</strong>
            <span>Local Ollama models</span>
          </div>
        </div>
      </aside>

      <main className="claude-main">
        <section className="hero">
          <div className="greeting">
            <span className="spark">*</span>
            <h1>Hey Buddy</h1>
          </div>

          <div className="composer-wrap">
            <div className="composer-card">
              <textarea
                className="composer-input"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  updateActiveChat({ prompt: e.target.value, title: e.target.value.trim().slice(0, 42) || "New chat" });
                }}
                placeholder="How can I help you today?"
              />

              <div className="composer-footer">
                <label className="attach-btn">
                  Attach
                  <input
                    key={fileInputKey}
                    type="file"
                    accept=".txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.log"
                    multiple
                    onChange={handleAttachFiles}
                    hidden
                  />
                </label>
                <button className="attach-plus" onClick={openImageAttach} type="button" title="Attach images">
                  +
                </button>
                <input
                  ref={imageInputRef}
                  key={`${fileInputKey}-image`}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAttachFiles}
                  hidden
                />

                <div className="composer-controls">
                  <select
                    className="mini-select"
                    value={selectedModelId}
                    onChange={(e) => {
                      setSelectedModelId(e.target.value);
                      updateActiveChat({ modelId: e.target.value });
                    }}
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.provider} / {model.id}
                      </option>
                    ))}
                  </select>

                  <select
                    className="mini-select"
                    value={responseFormat}
                    onChange={(e) => {
                      setResponseFormat(e.target.value);
                      updateActiveChat({ responseFormat: e.target.value });
                    }}
                  >
                    <option value="text">Text</option>
                    <option value="json">JSON</option>
                  </select>

                  <label className="inline-control">
                    <span>Temp {temperature.toFixed(1)}</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setTemperature(next);
                        updateActiveChat({ temperature: next });
                      }}
                    />
                  </label>

                  <label className="inline-control tokens">
                    <span>Tokens</span>
                    <input
                      type="number"
                      min="1"
                      max="64000"
                      value={maxTokens}
                      onChange={(e) => {
                        const next = Math.min(64000, Math.max(1, Number(e.target.value) || 1));
                        setMaxTokens(next);
                      updateActiveChat({ maxTokens: next });
                      }}
                    />
                  </label>

                  <button className="run-cta" onClick={runPrompt} disabled={loading || !selectedModel}>
                    Run prompt
                  </button>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="attachment-grid">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="attachment-card">
                      {attachment.type === "image" ? (
                        <img className="attachment-thumb" src={attachment.previewUrl} alt={attachment.name} />
                      ) : (
                        <div className="attachment-thumb attachment-text">
                          {attachment.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="attachment-meta">
                        <strong>{attachment.name}</strong>
                        <span>{attachment.type}</span>
                      </div>
                      <button className="attachment-remove" onClick={() => removeAttachment(attachment.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="quick-actions">
              {ACTIONS.map((item) => (
                <button
                  key={item.id}
                  className={selectedActionId === item.id ? "quick-pill active" : "quick-pill"}
                  onClick={() => chooseAction(item.id)}
                >
                  <span className="pill-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="meta-row">
          <Metric label="Model" value={selectedModel?.id || "-"} />
          <Metric label="Provider" value={selectedModel?.provider || "-"} />
          <Metric label="Status" value={statusText} />
          <Metric label="Mode" value={selectedAction.label} />
        </section>

        <section className="response-grid">
          <article className="panel response-panel-card">
            <div className="panel-head">
              <div>
                <h2>Response</h2>
                <span>{output ? "Ready" : "Waiting"}</span>
              </div>
              <div className="response-actions">
                <button className="response-action" onClick={copyOutput} disabled={!output.trim()}>
                  Copy
                </button>
                <button className="response-action" onClick={downloadOutput} disabled={!output.trim()}>
                  Download
                </button>
              </div>
            </div>
            {downloadMenuOpen && (
              <div className="download-menu">
                <button className="download-menu-item" onClick={downloadCsv}>CSV</button>
                <button className="download-menu-item" onClick={downloadPdf}>PDF</button>
                <button className="download-menu-item" onClick={downloadDocx}>DOCX</button>
              </div>
            )}
            <pre className="response-box">{output || "Your response will appear here."}</pre>
          </article>
        </section>
      </main>
    </div>
  );
}
