# EMS - Attendance Management System

A complete attendance management system with face recognition, leave management, and reporting capabilities.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express + Prisma ORM
- **Database:** PostgreSQL 15
- **Face Recognition:** face-api.js

## Prerequisites

- Node.js 18+
- PostgreSQL 15+

## Local Setup Instructions

### 1. Install PostgreSQL

Download and install PostgreSQL from https://www.postgresql.org/download/

During installation:
- Set the password for the postgres user
- Make sure PostgreSQL is running on port 5432 (default)

### 2. Create Database

Open pgAdmin or psql and create the database:

```sql
CREATE DATABASE ems_attendance;
```

Or using psql command line:
```bash
psql -U postgres -c "CREATE DATABASE ems_attendance;"
```

### 3. Configure Environment Variables

The backend is pre-configured with the following default settings in `backend/.env`:

```
DATABASE_URL="postgresql://ems_admin:EMS@2024Secure@localhost:5432/ems_attendance"
DB_HOST=localhost
DB_PORT=5432
DB_USER=ems_admin
DB_PASSWORD=EMS@2024Secure
DB_NAME=ems_attendance
JWT_SECRET=EMSLifestyle2024SecretKey@JWT!Secure
JWT_EXPIRES_IN=8h
PORT=3000
NODE_ENV=development
```

**Note:** If you want to use different credentials, either:
- Update the `backend/.env` file, OR
- Create a PostgreSQL user matching the credentials above:

```sql
CREATE USER ems_admin WITH PASSWORD 'EMS@2024Secure';
GRANT ALL PRIVILEGES ON DATABASE ems_attendance TO ems_admin;
ALTER DATABASE ems_attendance OWNER TO ems_admin;
```

### 4. Install Backend Dependencies

```bash
cd backend
npm install
```

### 5. Setup Database Schema

Generate Prisma client and push schema to database:

```bash
cd backend
npx prisma generate
npx prisma db push
```

Optionally seed the database with initial data:

```bash
cd backend
npx prisma db seed
```

Or open Prisma Studio to view/edit data:

```bash
cd backend
npx prisma studio
```

### 6. Start Backend

```bash
cd backend
npm run dev    # Development mode with hot reload
# OR
npm start     # Production mode
```

Backend API will be available at: http://localhost:3000/api

### 7. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 8. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:5173

## Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Prisma Studio | http://localhost:5555 |

## Default Login

| Email | Password | Role |
|-------|----------|------|
| yash.khade@ems.com | Gm@12345 | Director / GM |
| admin@ems.com | Admin@123 | Admin |
| vedant.katore@ems.com | Admin@123 | HR |
| sujal.ghagare@ems.com | Admin@123 | Employee |
| parikshit.thakre@ems.com | Admin@123 | Employee |

## Features

- Face recognition attendance
- Location-based verification
- Leave management with approval workflow
- Multiple shift support
- Department & employee management
- Excel/PDF reports
- Role-based access control
- Audit logging

## User Roles

| Role | Description |
|------|-------------|
| Admin | Full system control |
| GM | Company-wide oversight |
| HR | Employee management |
| Manager | Department-level control |
| Employee | Self-service only |

## Database

Managed by Prisma ORM. Key tables:
- `users` - Employee accounts
- `departments` - Company departments
- `shifts` - Work shift definitions
- `attendance_records` - Daily attendance
- `leave_requests` - Leave applications
- `leave_balances` - Annual leave quotas
- `holidays` - Company holidays
- `audit_logs` - Action history

### Prisma Commands
```bash
cd backend
npx prisma studio      # Open database GUI
npx prisma migrate dev # Run migrations
npx prisma generate     # Generate client
npx prisma db push     # Push schema to database
```

