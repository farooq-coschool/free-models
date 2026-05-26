import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import {
  getBenchmarks,
  getModels,
  getRunById,
  listRuns,
  saveRun
} from "./lib/store.js";
import { evaluateResponse, isJsonLike } from "./lib/evaluator.js";
import { routeTask } from "./lib/router.js";
import { runGoogle } from "./adapters/google.js";
import { runOllama } from "./adapters/ollama.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/models", async (_req, res) => {
  const models = await getModels();
  res.json(models);
});

app.get("/api/benchmarks", async (_req, res) => {
  const benchmarks = await getBenchmarks();
  res.json(benchmarks);
});

app.get("/api/runs", async (_req, res) => {
  const runs = await listRuns();
  res.json(runs);
});

app.get("/api/runs/:id", async (req, res) => {
  const run = await getRunById(req.params.id);
  if (!run) {
    return res.status(404).json({ error: "Run not found" });
  }
  res.json(run);
});

app.post("/api/run", async (req, res) => {
  try {
    const {
      provider = "ollama",
      model,
      messages = [],
      temperature = 0.3,
      maxTokens = null,
      responseFormat = "text",
      benchmarkId = null,
      prompt = ""
    } = req.body || {};

    if (!model) {
      return res.status(400).json({ error: "model is required" });
    }

    const startedAt = Date.now();
    const safeMaxTokens = Math.min(64000, Math.max(1, Number(maxTokens) || 4096));
    let result;
    const effectiveProvider = model === "gemma4:31b" ? "google" : provider;

    if (effectiveProvider === "ollama") {
      result = await runOllama({ model, messages, temperature, maxTokens: safeMaxTokens, responseFormat });
    } else if (effectiveProvider === "google") {
      result = await runGoogle({ model, messages, temperature, maxTokens: safeMaxTokens, responseFormat });
    } else {
      return res.status(400).json({ error: "Only local Ollama models are supported" });
    }

    const run = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      benchmarkId,
      provider: effectiveProvider,
      model,
      prompt,
      messages,
      temperature,
      maxTokens: safeMaxTokens,
      responseFormat,
      response: result.text,
      raw: result.raw,
      latencyMs: Date.now() - startedAt,
      createdAt: new Date().toISOString()
    };

    await saveRun(run);
    res.json(run);
  } catch (error) {
    res.status(500).json({ error: error.message || "Run failed" });
  }
});

app.post("/api/evaluate", async (req, res) => {
  try {
    const {
      responseText = "",
      expectedType = "text",
      expectedSchema = null,
      prompt = "",
      benchmark = null
    } = req.body || {};

    const evaluation = evaluateResponse({
      responseText,
      expectedType,
      expectedSchema,
      prompt,
      benchmark
    });

    res.json({
      schemaValid: evaluation.schemaValid,
      checks: evaluation.checks,
      scores: evaluation.scores,
      notes: evaluation.notes
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Evaluation failed" });
  }
});

app.post("/api/router/test", async (req, res) => {
  try {
    const { taskType, models = [], prompt = "", wantsJson = false } = req.body || {};
    const recommendation = routeTask({ taskType, models, prompt, wantsJson });
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: error.message || "Routing failed" });
  }
});

app.get("/api/router/rules", (_req, res) => {
  res.json(routeTask({ taskType: "lesson_plan", models: [], prompt: "", wantsJson: false, rulesOnly: true }));
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../../client/dist");

if (process.env.SERVE_CLIENT === "true") {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export { isJsonLike };
