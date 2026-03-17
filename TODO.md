# .env Setup Task Progress

## Completed:
- [x] Created frontend/.env with VITE_API_URL=http://localhost:3000/api
- [x] Created backend/.env with DB, JWT, PORT, etc. configs

## Follow-up Steps:
- [ ] Start MySQL server (ensure ems_attendance db exists, root pw set)
- [ ] cd backend && npx prisma db push  (or migrate dev)
- [ ] cd backend && npm run dev
- [ ] cd frontend && npm run dev
- [ ] Test login/attendance APIs
