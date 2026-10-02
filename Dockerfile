# Lubian Gestão na nuvem: Node 22 + Chromium (para os PDFs).
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1 \
    CHROMIUM_PATH=/usr/bin/chromium \
    CHROMIUM_CONTEINER=1

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=256
EXPOSE 3000
CMD ["sh", "scripts/iniciar-nuvem.sh"]
