# Edu Model Console

A compact dashboard for comparing local and remote language models across education tasks.

## What is included

- Express backend with normalized routes
- Model registry, prompt lab, evaluations, and router panel
- Local Ollama adapter
- JSON-backed persistence for runs and benchmarks
- Vite + React dashboard UI

## Local setup

1. Install dependencies in `server/` and `client/` with your package manager of choice.
2. Start the server on port `4000`.
3. Start the client on the Vite port.

## Production deployment

The easiest always-on setup is Docker on a VM.

Build and run locally:

```bash
docker compose up --build
```

Then open:

- `http://localhost`
- `http://localhost:4000/healthz`

Production notes:

- The container serves the built React client through Express.
- The app currently uses local Ollama models only.
- The `gemma4:31b` model is routed through the Google Gemini API when `GOOGLE_API_KEY` is set.
- If you deploy on Oracle Cloud, run the container on an Always Free VM.
- Ollama must be running on the same VM. The container uses `host.docker.internal` to reach it.
- Keep API keys in environment variables, not in the codebase.
- Put your real Gemini key in a local `.env` file, not in `.env.example`.

## Oracle deployment checklist

1. Create an Oracle Cloud Always Free compute instance.
2. Install Docker and Docker Compose on that VM.
3. Install Ollama on the VM and pull the models you want to expose.
4. Keep Ollama listening on `http://127.0.0.1:11434`.
5. Run `docker compose up -d` from the project folder.
6. Open port `80` in the VM firewall or security rules.

## API routes

- `GET /api/models`
- `GET /api/benchmarks`
- `GET /api/runs/:id`
- `POST /api/run`
- `POST /api/evaluate`
- `POST /api/router/test`

## Notes

- The starter uses JSON files for storage so it can run locally without a database server.
- Ollama expects a local OpenAI-compatible endpoint at `http://localhost:11434/v1/chat/completions`.
