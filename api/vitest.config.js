import { defineConfig } from 'vitest/config';

// M5: integrationstester mot GraphQL-servern. Körs i Node (ingen jsdom), mot en RIKTIG databas:
// lokalt den ni har igång (docker compose up -d postgres mongo + npm run seed + npm run migrate:logs),
// i pipelinen två services som startas för jobbet (ci.yml, jobbet Integration).
export default defineConfig({
  // Paketet graphql har en särskild utvecklingsutgåva (exports-villkoret "development") som Vitest
  // annars väljer för VÅRA filer men inte för graphql-yoga – då finns GraphQLError två gånger,
  // `instanceof` misslyckas och yoga maskerar våra fel som "Unexpected error". En graphql, tack.
  ssr: { resolve: { conditions: ['module', 'node'] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    // Testerna delar databas – kör filerna efter varandra, inte parallellt.
    fileParallelism: false,
    testTimeout: 10000,
  },
});
