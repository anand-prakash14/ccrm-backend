# CRM API Service — multi-stage build. CA-141 (CRM module container only;
# Web Frontend and the Agents module — ADK Web UI, Agent Orchestrator, MCP
# Server — are separate, not-yet-built projects and out of scope here).

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY scripts/register-paths.js ./scripts/register-paths.js
COPY tsconfig.json ./

EXPOSE 3000
CMD ["node", "-r", "./scripts/register-paths.js", "dist/main.js"]
