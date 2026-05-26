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

## Render deployment

Render can host this repo as a Docker web service and give you a public `onrender.com` URL. Render web services must bind to `0.0.0.0`, the default expected port is `10000`, and Docker services are supported directly from your repo's Dockerfile or `render.yaml`. ([render.com](https://render.com/docs/web-services/?utm_source=openai)) ([render.com](https://render.com/docs/docker/?utm_source=openai)) ([render.com](https://render.com/docs/blueprint-spec/?utm_source=openai))

For Render:

1. Connect the GitHub repo to a Render web service.
2. Use the Docker runtime.
3. Add `GOOGLE_API_KEY` in Render environment variables.
4. Deploy the `main` branch.

On Render, the app will expose the Google-backed `gemma4:31b` option, because local Ollama models are not available inside Render's hosted container environment. That follows from the app's local-Ollama design and Render's container hosting model. 

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
