FROM node:20-alpine
WORKDIR /app

# better-sqlite3 needs build tools
RUN apk add --no-cache python3 make g++ dumb-init

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src/

EXPOSE 3000
ENV NODE_ENV=production PORT=3000 STORAGE_PATH=/app/data/uploads DATA_PATH=/app/data

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/index.js"]
