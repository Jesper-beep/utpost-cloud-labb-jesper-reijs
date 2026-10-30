// M3: adresserna läses från miljön när den finns (compose sätter dem), annars gäller de gamla
// localhost-värdena.
// M6 (skuld 7): JWT-hemligheten ligger inte längre i koden. Lokalt gäller ett utvecklingsvärde,
// i molnet kommer värdet från plattformens secret store (se .env.example och infra/azure/).
// GIT_SHA sätts när imagen byggs (api/Dockerfile) och syns i /api/health – så ser man vilken commit som kör.
export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://utpost:utpost@localhost:5433/utpost',
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://utpost:utpost@localhost:27017/utpost?authSource=admin',
  jwtSecret: process.env.JWT_SECRET ?? 'utpost-dev-secret-byt-i-molnet',
  gitSha: process.env.GIT_SHA ?? 'dev',
  port: Number(process.env.PORT ?? 4000),
  uploadDir: './uploads',
};
