# Utpost API. Byggs från repots ROT (context: . i compose.yaml, eller `docker build -f api/Dockerfile .`)
# eftersom api/ beror på workspace-paketet shared/ och lockfilen ligger i roten.
FROM node:22-alpine

WORKDIR /app

# Först bara paketfilerna. Det här lagret ändras sällan, så npm ci cachas mellan byggen
# och körs bara om när beroendena ändrats – inte varje gång en rad kod ändras.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
RUN npm ci --workspace=api --omit=dev

# Sedan koden. Ändras ofta, ligger därför sist.
COPY shared/ shared/
COPY api/ api/

WORKDIR /app/api
EXPOSE 4000

# M6: commiten imagen byggdes från. Pipelinen skickar in den (build-args), lokalt blir det "dev".
# Syns i /api/health som `sha` – det är så deploysteget vet att molnet kör rätt version.
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA

# Node 22.18+ kör routes/guides.ts direkt – inget byggsteg behövs.
# boot.js: väntar på databasen och seedar om SEED_ON_START=1 (staging i molnet), startar sedan index.js.
CMD ["node", "src/boot.js"]
