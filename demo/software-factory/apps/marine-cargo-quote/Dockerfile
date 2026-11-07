# Cloud Run-ready image. Not deployed by the factory; see the demo README
# ("Plugging in later") for how a preview revision with no traffic would use it.
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "src/server.js"]
