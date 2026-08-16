# Development image for the Next.js + Payload app (M5). Matches the Postgres
# container from M1 — see docker-compose.yml. A production stage is added at M49.

FROM node:22-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
