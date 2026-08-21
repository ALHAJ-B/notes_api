FROM node:20-alpine

WORKDIR /app

# Copy package files from build context (project root)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy backend source code
COPY backend/ ./backend/

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R node:node /app/data

# Run as non-root user
USER node

EXPOSE 5000

CMD ["node", "backend/src/server.js"]
