# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
# Install all dependencies to get the Prisma CLI, then generate the client
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npx prisma generate

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run the backend server
WORKDIR /app/backend
CMD ["node", "src/server.js"]
