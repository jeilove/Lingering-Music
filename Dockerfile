# Use Node.js as base
FROM node:20-slim AS builder

# Install pnpm and system dependencies for builder
RUN apt-get update && apt-get install -y openssl && npm install -g pnpm

WORKDIR /app

# Copy monorepo configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Build server (shared interfaces are handled by tsc)
RUN pnpm --filter server build

# Production image
FROM node:20-slim

# Install system dependencies (Python for yt-dlp, ffmpeg for audio processing, openssl for Prisma)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via curl (to get the latest version)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy build artifacts and production node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/prisma ./prisma
COPY apps/server/cookies.txt ./apps/server/cookies.txt

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV YTDLP_PATH=yt-dlp

EXPOSE 3001

# Command to run the server
CMD ["node", "apps/server/dist/index.js"]
