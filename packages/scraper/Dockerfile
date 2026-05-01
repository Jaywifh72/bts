FROM node:20-slim
RUN npx playwright install --with-deps chromium
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/scraper/package.json ./packages/scraper/
COPY packages/db/package.json ./packages/db/
RUN corepack enable && pnpm install --frozen-lockfile
COPY packages/ ./packages/
CMD ["pnpm", "--filter", "@bts/scraper", "start"]
