# Free deployment guide

| Database | Hosting |
|----------|---------|
| **Supabase** (recommended if you already use it) → see **[DEPLOY_SUPABASE.md](./DEPLOY_SUPABASE.md)** | **Vercel** (free) |

Alternative database: [Neon](https://neon.tech) — same steps, use Neon connection string instead of Supabase.

---

## Short version (Supabase + Vercel)

1. Supabase → **Settings → Database** → copy **URI** (Session / port 5432)  
2. PC: `cd backend` → set `DATABASE_URL` → `npx prisma db push` → `npx prisma db seed`  
3. GitHub → push repo  
4. Vercel → import repo → Build: `npm run vercel-build` → Output: `frontend/dist`  
5. Vercel env: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`  
6. Deploy → login `admin@ems.com` / `Admin@123`  

Full details: **[DEPLOY_SUPABASE.md](./DEPLOY_SUPABASE.md)**
