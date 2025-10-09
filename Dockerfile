FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app .
ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["pnpm", "run", "preview", "--host", "0.0.0.0", "--strictPort", "--port", "3000"]

