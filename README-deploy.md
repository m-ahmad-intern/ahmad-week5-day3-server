# Server — README: Deploy on Railway

Purpose
- Instructions to deploy the `server/` (NestJS) to Railway and which environment variables to set.

Required environment variables
- MONGO_URI — MongoDB connection string (Railway-managed or Atlas). Example: `mongodb+srv://user:pass@cluster0.mongodb.net/dbname`
- JWT_SECRET — strong random secret for signing JWTs (keep private)
- CLIENT_URL — production client origin for CORS (e.g. `https://your-app.vercel.app`)
- PORT — optional (server reads `process.env.PORT` if set; Railway typically injects this)

Railway (recommended) — quick steps
1. Create a Railway project at https://railway.app and add a new service.
2. Add the MongoDB plugin (Railway managed DB) or supply an external `MONGO_URI`.
3. Connect your repo and set the service root to `server/`, or deploy from local with Railway CLI.

Railway CLI (Windows cmd.exe) — example
```
cd server
railway login
railway init   # create or link a project
railway up --path .
```

Build & start configuration (what Railway should run)
- Build command: `npm ci && npm run build`
- Start command: `npm run start:prod` (or `npm run start` if your `package.json` uses that)
- Verify `server/package.json` scripts and adjust Railway settings if needed.

Setting environment variables on Railway
- In the Railway project UI, open the service -> Variables and add:
  - `MONGO_URI` = <Railway/Atlas connection string>
  - `JWT_SECRET` = <generate a 32+ byte secret>
  - `CLIENT_URL` = https://<your-vercel-domain> (set after client deploy)

Generate a JWT_SECRET locally (Node) — Windows cmd.exe
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Verification
- Check Railway logs for app start and `MONGODB_URI` print from `server/src/main.ts`.
- Use the service URL Railway provides, e.g. `https://your-service.up.railway.app`.
- Test a simple endpoint:
```
curl https://<railway-url>/auth/register -X POST -H "Content-Type: application/json" -d "{\"username\":\"test\",\"email\":\"a@b.com\",\"password\":\"pass123\"}"
```

CORS note
- Set `CLIENT_URL` to your Vercel domain for strict CORS. If you see CORS errors, confirm the exact origin string matches.

Tips
- Keep `JWT_SECRET` private.
- If you prefer MongoDB Atlas, paste its connection string into `MONGO_URI`.
- If Railway provides a `PORT` env, the server will use it automatically.

If you want, I can add a small `/health` endpoint to `server/` for quick uptime checks.
