# Deploy EMS with Supabase (free) + Vercel (free)

You already have **Supabase** — use it as the database. Host the app on **Vercel** (free). No Neon needed.

| Service | Role |
|---------|------|
| **Supabase** | PostgreSQL database (you already have this) |
| **Vercel** | React frontend + Node API |

---

## Step 1 — Get your Supabase connection string

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** (gear) → **Database**
4. Under **Connection string**, choose **URI**
5. Copy the string and replace `[YOUR-PASSWORD]` with your database password

Use **Session mode** (port **5432**) — best for Prisma setup:

```
postgresql://postgres.xxxxxxxxxxxx:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

Or the **direct** host (also works):

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

**Password has special characters?** URL-encode them (`@` → `%40`, `#` → `%23`, etc.) or reset the DB password in Supabase to letters and numbers only.

---

## Step 2 — Create tables & seed (run once on your PC)

```powershell
cd c:\Users\91883\OneDrive\Desktop\EMS\backend

# Paste YOUR Supabase URI (one line, in quotes)
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"

npm install
npx prisma generate
npx prisma db push
npx prisma db seed
```

- `db push` creates all EMS tables in your Supabase project  
- `db seed` adds default users (admin, HR, etc.)

**Already have tables in Supabase?**  
- Same schema → `db push` updates safely  
- Wrong/old schema → in Supabase **Table Editor**, drop old EMS tables, then run `db push` again  

### Default logins (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ems.com | Admin@123 |
| Director | yash.khade@ems.com | Gm@12345 |
| Employee | sujal.ghagare@ems.com | Admin@123 |

Check in Supabase: **Table Editor** → you should see `users`, `departments`, `attendance_records`, etc.

---

## Step 3 — Local `.env` (optional, for dev on your PC)

Create `backend/.env` (do not commit):

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
JWT_SECRET=your-long-random-secret-here
JWT_EXPIRES_IN=8h
PORT=3000
NODE_ENV=development
FACE_RECOGNITION_THRESHOLD=0.6
```

Then run backend + frontend as usual.

---

## Step 4 — Deploy on Vercel

1. Push project to **GitHub** (if not already)
2. [vercel.com](https://vercel.com) → **Add New Project** → import repo
3. Build settings:
   - **Build Command:** `npm run vercel-build`
   - **Output Directory:** `frontend/dist`
4. **Environment variables** (Settings → Environment Variables → Production):

| Name | Value |
|------|--------|
| `DATABASE_URL` | **Port 6543** URI with `?pgbouncer=true` (not the 5432 local URL) |
| `JWT_SECRET` | Same secret as local (long random string) |
| `JWT_EXPIRES_IN` | `8h` |
| `NODE_ENV` | `production` |
| `FACE_RECOGNITION_THRESHOLD` | `0.6` |

5. **Deploy**

Do **not** set `VITE_API_URL` — the app calls `/api` on the same domain.

---

## Step 5 — Verify

| Check | URL |
|-------|-----|
| API health | `https://YOUR-APP.vercel.app/api/health` |
| App | `https://YOUR-APP.vercel.app` |
| Login | admin@ems.com / Admin@123 |

In Supabase **Table Editor** → `users` → `last_login` should update after login.

---

## Supabase + Vercel tips (free tier)

### Connection pooling (optional, more traffic later)

For serverless, Supabase offers **Transaction** pooler (port **6543**). Use on Vercel only if you see connection errors:

```
postgresql://postgres.xxx:PASSWORD@aws-0-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Run `db push` / `db seed` with **Session** (5432), not the pooler URL.

### Uploads folder

Vercel does not keep files on disk. Profile/face uploads may not persist after redeploy. For production, later use **Supabase Storage** (free tier included).

### Face recognition

Put face-api weights in `frontend/public/models/` and redeploy. Password login works without them.

### Security

- Never commit `backend/.env` or Supabase password to GitHub  
- In Supabase: **Authentication** is separate — EMS uses its own `users` table and JWT  
- Rotate `JWT_SECRET` if it was ever exposed  

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| `Can't reach database` | Check password, URL-encoding, Supabase project not paused |
| `P1001` / SSL error | Add `?sslmode=require` to the end of `DATABASE_URL` |
| Login 500 on Vercel | `DATABASE_URL` + `JWT_SECRET` set in Vercel env; redeploy |
| Empty app / no users | Run `npx prisma db seed` with Supabase `DATABASE_URL` |
| `relation does not exist` | Run `npx prisma db push` against Supabase |
| Works locally, fails on Vercel | Vercel env vars must match; trigger **Redeploy** after adding them |

---

## Quick command reference

```powershell
cd backend
$env:DATABASE_URL="postgresql://..."
npx prisma db push      # update schema
npx prisma db seed      # reset default users/data
```
