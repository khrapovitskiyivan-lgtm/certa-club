# Сборка Certa для своего сервера. Запуск через docker-compose.yml (сайт + Postgres + HTTPS).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S certa && adduser -S certa -G certa && mkdir -p /data && chown certa:certa /data
COPY --from=build --chown=certa:certa /app/.next/standalone ./
COPY --from=build --chown=certa:certa /app/.next/static ./.next/static
COPY --from=build --chown=certa:certa /app/public ./public
USER certa
EXPOSE 3000
CMD ["node", "server.js"]
