export function getDockerfile(language: string) {
    if (language === "typescript") {
      return `FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.production ./

EXPOSE 5000

CMD ["npm", "start"]
`;
    }
    return `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
`;
};

export function getDockerCompose(_language: string) {
    return `
services:
  app:
    build: .
    ports:
      - "5000:5000"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - PORT=5000
    restart: unless-stopped
`;
};