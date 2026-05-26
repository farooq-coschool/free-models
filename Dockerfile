FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY client/vite.config.js client/vite.config.js

RUN npm install --prefix server && npm install --prefix client

COPY server server
COPY client client

RUN cd client && ./node_modules/.bin/vite build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV SERVE_CLIENT=true

COPY package.json ./
COPY server/package.json server/package.json
COPY --from=build /app/server/node_modules server/node_modules
COPY --from=build /app/server server
COPY --from=build /app/client/dist client/dist

EXPOSE 4000

CMD ["node", "server/src/index.js"]
