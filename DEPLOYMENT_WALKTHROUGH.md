# EMS Deployment Walkthrough (Non-Docker)

The project has been successfully prepared for production deployment without using Docker. It is now configured to use a fresh SQLite database and serve the React frontend directly from the Node.js backend.

## What Was Done
1.  **Database Configuration**: Switched from MySQL (which had authentication issues) back to a fresh SQLite database (`production.db`) for a clean start.
2.  **Environment Setup**: Configured `.env` with `NODE_ENV=production` and the correct `DATABASE_URL`.
3.  **Frontend Build**: Compiled the React application into static files in `frontend/dist`.
4.  **Backend Integration**: Verified that the backend is configured to serve the frontend static files in production mode.
5.  **Initialization**: 
    - Installed all dependencies.
    - Synchronized the database schema using Prisma.
    - Seeded the database with default administrative and employee accounts.

## How to Run the Project
To start the production server, follow these steps:

1.  Open a terminal in the `backend` directory.
2.  Run the start command:
    ```powershell
    npm start
    ```
3.  The application will be available at: **[http://localhost:3000](http://localhost:3000)**

## Default Login Credentials
You can use the following accounts to log in:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@ems.com` | `Admin@123` |
| **Director** | `yash.khade@ems.com` | `Gm@12345` |
| **Employee** | `sujal.ghagare@ems.com` | `Admin@123` |

## Project Structure (Production)
- `backend/production.db`: The live database file.
- `frontend/dist/`: The optimized frontend assets being served.
- `backend/uploads/`: Directory for uploaded employee photos and documents.
