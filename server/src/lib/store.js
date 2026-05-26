import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");

const modelFile = path.join(dataDir, "registry.json");
const benchmarkFile = path.join(dataDir, "benchmarks.json");
const runFile = path.join(dataDir, "runs.json");
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

async function ensureFile(filePath, fallbackValue) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(fallbackValue, null, 2), "utf8");
  }
}

async function readJson(filePath, fallbackValue) {
  await ensureFile(filePath, fallbackValue);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw || JSON.stringify(fallbackValue));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export async function getModels() {
  try {
    const res = await fetch(`${ollamaBaseUrl}/api/tags`);
    if (!res.ok) {
      throw new Error(`Ollama model list request failed: ${res.status}`);
    }

    const data = await res.json();
    const models = Array.isArray(data?.models) ? data.models : [];

    const localModels = models.map((model) => ({
      id: model.name,
      name: model.name,
      provider: model.name === "gemma4:31b" ? "google" : "ollama",
      model: model.name,
      isFree: true,
      supportsJson: true,
      supportsLongContext: false,
      bestFor: [],
      contextNotes:
        model.name === "gemma4:31b"
          ? "Routed through Google Gemini API"
          : `Local Ollama model${model.details?.family ? ` - ${model.details.family}` : ""}`,
      status: "online",
      size: model.size || null,
      modifiedAt: model.modified_at || null
    }));

    return localModels;
  } catch {
    return [];
  }
}

export async function getBenchmarks() {
  return readJson(benchmarkFile, []);
}

export async function listRuns() {
  return readJson(runFile, []);
}

export async function saveRun(run) {
  const runs = await listRuns();
  runs.unshift(run);
  await writeJson(runFile, runs.slice(0, 500));
  return run;
}

export async function getRunById(id) {
  const runs = await listRuns();
  return runs.find((run) => run.id === id) || null;
}
