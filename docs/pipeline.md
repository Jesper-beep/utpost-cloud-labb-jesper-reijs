# Pipeline – Utpost

*Exempelifyllt facit (M1). Tider är från en riktig körning på mallrepot – teamen fyller i sina egna.*

## Flödet

```mermaid
flowchart LR
  B[branch + commit] --> PR[pull request mot main]
  PR --> Q[Kvalitet<br/>npm ci · lint · format:check · typecheck · test]
  PR --> BU[Bygg<br/>npm ci · build → artefakt]
  PR --> I[Integration<br/>postgres + mongo som services · seed · migrate:logs · test:api]
  Q --> IM[Image<br/>bygger api + client · publicerar i GHCR på main]
  BU --> IM
  Q --> S{status checks<br/>gröna?}
  BU --> S
  I --> S
  IM --> S
  S -->|ja| M[merge – knappen är grön]
  S -->|nej| F[fixa, pusha igen<br/>körningen startar om]
  M --> MAIN[main är alltid byggbar]
```

## Vad som körs, och varför

| Steg | Kommando | Fångar | Tar |
|---|---|---|---|
| Lint | `npm run lint` (ESLint på `client/`) | oanvända variabler, fel i Vue-templates, `no-undef` | ~4 s |
| Format | `npm run format:check` (Prettier, bara kontroll) | filer som inte kördes genom Prettier – ändrar inget i CI, det gör man lokalt | ~2 s |
| Test | `npm test` (`vitest run`) | ett röktest på guidevyn den här veckan (M1) – riktiga tester i M2 | ~3 s |
| Bygg | `npm run build` (`vite build` av `client/`) | importfel, trasiga templates, allt som bara syns vid bygge | ~2 s |
| Typkontroll (M2, M5) | `npm run typecheck` (codegen + `vue-tsc` + `tsc`) | ett fält som tagits bort ur schemat men används i en vy – kedjan schema → fråga → vy | ~10 s |
| Integration (M5) | `npm run test:api` mot Postgres och Mongo som *services* | resolvers som inte stämmer med databasen, N+1 som kommit tillbaka, mutationer utan inloggningskrav – det klientens mockade tester aldrig ser | ~40 s inkl. start av databaserna |
| Image (M4) | `docker/build-push-action` på `api/Dockerfile` och `client/Dockerfile` | en Dockerfile som inte går att bygga; på `main` publiceras imagerna med `sha-`tagg | ~1,5 min |

`npm ci` (~25 s) dominerar – den installerar alla tre workspaces inklusive React-klientens beroenden. När `web/` tas bort (M6) halveras tiden.

## Branch protection (ruleset på `main`)

- Kräver PR – ingen pushar direkt till `main`
- Kräver status checks **Kvalitet**, **Bygg**, **Integration** och **Image** gröna innan merge
- Kräver att branchen är uppdaterad mot `main` före merge (annars testas en kod som aldrig kommer att finnas)
- Gäller även admins

## Vanliga fel vi sett

- **Grönt lokalt, rött i CI:** `npm run lint` lokalt är samma kommando som i CI. Kör det innan du pushar. Skillnaden brukar vara en fil som inte är sparad, eller `--fix` lokalt som gömde felet.
- **`format:check` rött:** kör `npm run format --workspace=client` och committa. CI ska aldrig ändra kod, bara säga nej.
- **Status check heter fel i rulesetet:** namnet är jobbets `name:` (Kvalitet, Bygg, Integration, Image) – inte filnamnet.
- **Integration rött men testerna gröna lokalt:** databasen i jobbet är tom tills `npm run seed` körts, och `Tour.logs` läser Mongo – `npm run migrate:logs` måste också ha körts. Portarna är `5432`/`27017` på `localhost` i jobbet, inte `5433` som i compose.
