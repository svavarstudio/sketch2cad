# Sketch2CAD Web v0.5

Next.js **16.3** Instant Navigations · Architecture + Freehand studio · Stripe test subscriptions ·  
OpenAI Realtime WebRTC · Ollama tool-calling · IFC export · Wall-mesh Three.js · CadQuery worker.

## Live
- App: https://sketch2cad-svavarstudio.vercel.app  
- Repo: https://github.com/svavarstudio/sketch2cad  

## Stripe test prices (created)
| Plan | Price ID |
|------|----------|
| Starter $19 | `price_1UDWjJK7Uj7Zs6DgCms3BcaD` |
| Pro $49 | `price_1UDWjMK7Uj7Zs6Dg4Kdq4KUF` |
| Team $149 | `price_1UDWjOK7Uj7Zs6DgLF0NbDq2` |

Set `STRIPE_SECRET_KEY=sk_test_…` on Vercel. Test card `4242 4242 4242 4242`.

## Features
1. **OpenAI Realtime WebRTC** — Studio → OpenAI Realtime button (needs `OPENAI_API_KEY`)
2. **Ollama tools** — Voice mode dropdown → Ollama tools (`OLLAMA_URL`)
3. **Smart placement** — “door on south wall”, “window middle of longest wall”
4. **Multi-room / interior walls / dimensions / IFC**
5. **Wall mesh 3D** — true extruded walls in Three.js
6. **Freehand multi-view** — front/top/side pressure strokes
7. **Entitlements** — Stripe webhook → email plan map
8. **CAD worker** — `cad-worker/` Docker for Fly/Railway STEP export

## CAD worker deploy (Fly example)
```bash
cd cad-worker
fly launch --name sketch2cad-worker --region iad
fly deploy
# set CAD_WORKER_URL=https://sketch2cad-worker.fly.dev on Vercel
```

## Local
```bash
npm i && npm run dev
```
