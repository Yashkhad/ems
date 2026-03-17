# EMS - Attendance Management System

A complete attendance management system with face recognition, leave management, and reporting capabilities.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express + Prisma ORM
- **Database:** MySQL 8.0
- **Face Recognition:** face-api.js

## Prerequisites

- Node.js 18+
- MySQL 8.0+

## Local Setup Instructions (MySQL)

### 1. Install MySQL

Download and install MySQL from https://www.mysql.com/downloads/

During installation:
- Set the password for the root user
- Make sure MySQL is running on port 3306 (default)

### 2. Create Database

Open MySQL Workbench or mysql command line and create the database:

```sql
CREATE DATABASE ems_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or using mysql command line:
```bash
mysql -u root -p -e "CREATE DATABASE ems_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```
DATABASE_URL="mysql://root:Harshal@06@localhost:3306/ems_attendance"
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Harshal@06
DB_NAME=ems_attendance
JWT_SECRET=EMSLifestyle2024SecretKey@JWT!Secure
JWT_EXPIRES_IN=8h
PORT=3000
NODE_ENV=development
```

**Note:** If you want to use a different user, create one with appropriate privileges:

```sql
CREATE USER 'ems_admin'@'localhost' IDENTIFIED BY 'EMS@2024Secure';
GRANT ALL PRIVILEGES ON ems_attendance.* TO 'ems_admin'@'localhost';
FLUSH PRIVILEGES;
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

### 6. (Optional) Run MySQL Stored Procedures

If you want to use the stored procedures for attendance marking, run the init script:

```bash
mysql -u root -p ems_attendance < database/init_mysql.sql
```

### 7. Start Backend

```bash
cd backend
npm run dev    # Development mode with hot reload
# OR
npm start     # Production mode
```

Backend API will be available at: http://localhost:3000/api

### 8. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 9. Start Frontend

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

## Migration from PostgreSQL

If you were using PostgreSQL previously:

1. Export data from PostgreSQL
2. Create new MySQL database
3. Update `backend/prisma/schema.prisma` provider to `mysql`
4. Run `npx prisma db push` to create tables
5. Import data to MySQL
6. Update environment variables to use MySQL connection string

