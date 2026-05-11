# Deployment Guide - EMS Attendance Management System

This document explains how to deploy the EMS project using Docker.

## Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop/) installed on your machine or server.
- [Docker Compose](https://docs.docker.com/compose/install/) installed.

## 1. Local Deployment (for testing)
To run the production version locally:

1. Open a terminal in the project root.
2. Build and start the containers:
   ```bash
   docker-compose up --build
   ```
3. Access the application at `http://localhost:3000`.

## 2. Cloud Deployment (VPS)
To deploy on a VPS (e.g., DigitalOcean, AWS EC2, Linode):

1. Clone the repository to your server.
2. Ensure Docker and Docker Compose are installed.
3. Update the `docker-compose.yml` environment variables if necessary (especially `JWT_SECRET`).
4. Run the command:
   ```bash
   docker-compose up -d --build
   ```
   The `-d` flag runs it in detached mode (background).

## 3. Deployment on Render/Railway
These platforms can build from the `Dockerfile` automatically.

1. Connect your GitHub repository to the platform.
2. Select "Web Service".
3. The platform will detect the `Dockerfile` and build it.
4. Add environment variables in the platform's dashboard:
   - `JWT_SECRET`: A long random string.
   - `NODE_ENV`: `production`
5. **Important**: Since this project uses SQLite, ensure you mount a **Persistent Volume** at `/app/backend/prisma/dev.db` to prevent data loss when the container restarts.

## Troubleshooting
- **Database Errors**: Ensure the volume mapping for the SQLite database is correct.
- **Port Conflicts**: If port 3000 is already in use, change the mapping in `docker-compose.yml`.
- **Face Recognition**: The first build might take some time as it downloads dependencies for `face-api.js`.
