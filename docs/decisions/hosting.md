# Beslutsdokument: hostingval

*Ett av teamets sex beslutsdokument. Skrivs i M6, hålls levande. Samma mall som `api-stil.md`, `databas.md` och `testing.md`. Det här dokumentet examinerar Cloud 1 (redogöra för hostinglösningar som AWS, Azure, Google Cloud) – skriv så att en läsare utan Azure-konto förstår valet.*

**Datum:**
**Beslut:** *(en eller två meningar: var kör Utpost i staging, var ska den köra i produktion, och vad är skillnaden?)*

## Bakgrund
*Vad har vi när M5 är klar: två images i GHCR taggade med sha, en pipeline som bygger dem, compose lokalt. Vad saknas för att någon utanför teamet ska kunna öppna appen? Vilka krav ställer kursen (M6: automatisk deploy till staging vid merge, secrets ur koden, publik URL)?*

## Vad vi faktiskt hyr
*Fyll i tabellen med era egna värden ur Azure-portalen eller `az containerapp show`. Kolumnen "nivå" = IaaS / PaaS / SaaS / serverless (klippet *Molnet: vad det är och vad man hyr*).*

| Del | Tjänst | Nivå | Vem sköter uppdateringar/skalning | Vad det kostar oss i staging |
|---|---|---|---|---|
| Klient + API | Azure Container Apps (`utpost-staging` i miljön `utpost-env`, Sweden Central), två containrar i samma app | Serverless containers (PaaS) | Azure: OS, runtime, skalning 0–1, TLS och publik URL. Vi: imagerna | _fylls i ur portalen (Cost Management)_ – skalar till noll, inom gratiskvoten |
| Postgres | `postgres:16` som sidecar i samma app, ingen volym | Container i PaaS – ingen managed databas | Vi (image-version); data försvinner vid kallstart, seedas om (`SEED_ON_START=1`) | Ingår i appens förbrukning |
| MongoDB | `mongo:8.2` som sidecar i samma app, ingen volym | Container i PaaS – ingen managed databas | Vi; samma som Postgres | Ingår i appens förbrukning |
| Images | GHCR | SaaS (registry) | GitHub | 0 kr – publika paket |
| Deploy | GitHub Actions → `az containerapp update` (OIDC, ingen secret) | SaaS (CI/CD) | GitHub (runners), vi (`ci.yml`) | 0 kr – publikt repo |

## Alternativ vi jämförde
*Minst tre riktiga alternativ, och minst två leverantörer. Förslag: Azure Container Apps (det vi gjorde) · Azure App Service for Containers · Google Cloud Run · AWS ECS på Fargate (App Runner tar inte längre nya kunder) · en VM (IaaS) med docker compose · Render/Railway (PaaS utanför de tre stora). För varje: vad hade ändrats i repot, vad hade kostat, vad hade vi fått/förlorat?*

| Alternativ | Vad ändras i repot | Kostnad (staging) | För | Emot |
|---|---|---|---|---|
| | | | | |

## Staging och produktion är inte samma sak
*I staging kör databaserna som sidecars utan volym och seedas vid varje kallstart. Vad krävs för produktion? Managed databas (vilken, vad kostar den), backup, en app som inte skalar till noll, egen domän och certifikat, loggar. Skriv vad ni skulle byta och vad som INTE behöver bytas (imagen? pipelinen?).*

## Inlåsning
*Om Azure försvann i morgon: vilka filer i repot ändras, och vilka ändras inte? Räkna upp dem. Det är svaret på hur portabel lösningen är – och argumentet för att bygga på image + pipeline i stället för plattformens egna byggverktyg.*

**Finns bara för Azure (byts vid flytt):**
- `infra/azure/staging.yaml` – appens fyra containrar, secrets, skalning
- `infra/azure/skapa-staging.sh` – skapar resursgrupp, miljö och app
- `infra/azure/identitet.sh` – app registration + federerad identitet + Contributor
- jobbet `deploy` i `.github/workflows/ci.yml` – `azure/login` och `az containerapp update`

**Likadant i alla moln (ändras inte):**
- `api/Dockerfile`, `client/Dockerfile` – imagerna i GHCR vet inte var de kör
- `client/nginx.conf.template` – läser `API_UPSTREAM` vid start
- `.env.example` – vilka variabler som finns
- `api/src/` – all kod; jobben Kvalitet, Bygg, Integration och Image

**Värden som skiljer compose från Azure:**

| Variabel | compose | Azure staging |
|---|---|---|
| `API_UPSTREAM` | `api:4000` | `localhost:4000` (sidecars delar nätverk) |
| `DATABASE_URL` / `MONGO_URL` | `postgres`/`mongo` som värdnamn, lösenord ur `.env` | `localhost`, lösenord slumpat av skriptet, som secret |
| `JWT_SECRET` | ur `.env` | slumpat av skriptet, bara som secret i Azure |
| `SEED_ON_START` | inte satt | `1` – tom databas vid varje kallstart |

## Konsekvenser
*Vad kostar valet i tid och pengar? Kallstarten när appen skalat till noll. Gratiskvoten som delas av alla i prenumerationen. Hemligheter som nu lever på två ställen (lokalt `.env`, i molnet secrets) – hur roteras de? Vem i teamet har tillgång till portalen?*

- **Kallstart:** första anropet efter att appen skalat till noll tog _fylls i_ s (fyra containrar startar, databaserna seedas). Varma anrop: ~0,1 s.

**Skrivet av:**
