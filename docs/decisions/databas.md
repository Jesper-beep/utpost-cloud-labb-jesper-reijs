# Beslutsdokument: databasval

*Ett av teamets sex beslutsdokument. Skrivet i M3, hålls levande. (Det här är ett ifyllt exempel – ert eget ska bygga på era egna mätningar och argument.)*

**Datum:** 2026-10-09
**Beslut:** Turer med sina mätpunkter flyttar till MongoDB, som ett dokument per tur med punkterna inbäddade. Guider, användare och foton stannar i Postgres. Migreringen genomförs i M5, tillsammans med N+1-fixen i `/api/tours`.

## Bakgrund
Vi ärvde en databas där allt ligger i Postgres, inklusive `tour_logs`: en rad per mätpunkt, i dag 5 800 rader för 200 turer (20–40 punkter per tur i testdatan, "ca 300" enligt kommentaren i schemat). Det är skuld 4. Mätpunkter läses aldrig var för sig – klienten vill alltid ha hela turen – men `/api/tours` gör en fråga per tur för att hämta dem: 280 kB och ~190 databasfrågor för en sida. Relationsmodellen tvingar oss att sätta ihop något som borde ha lagrats ihop.

## Dokumentmodellen för turer
En tur = ett dokument i collectionen `tours`. Mätpunkterna ligger inbäddade i `logs` eftersom de skrivs en gång (när turen laddas upp), läses alltid tillsammans med turen, och aldrig refereras från något annat håll. `stats` är förberäknat så att listvyn slipper läsa `logs` alls (`projection: { logs: 0 }`).

```json
{
  "_id": "ObjectId",
  "tour_id": 42,
  "user_id": 3,
  "guide_id": 12,
  "title": "Kvällstur Norra Sjörundan",
  "started_at": "2026-09-02T11:16:41Z",
  "distance_m": 8400,
  "notes": null,
  "logs": [
    { "t": "2026-09-02T11:16:41Z", "lat": 62.242, "lon": 17.953, "elevation_m": 153, "heart_rate": 147, "note": null }
  ],
  "stats": { "points": 39, "elevation_gain_m": 240 }
}
```

Storlek: 81 byte per punkt i BSON, 3–4 kB per tur i dag. Gränsen på 16 MB per dokument nås vid ungefär 200 000 punkter – en GPS-klocka som loggar varje sekund i tio timmar ger 36 000. Skulle vi någon gång ta emot flerdygnsturer med sekundupplösning delar vi `logs` i ett eget dokument per dygn (bucket-mönstret), men det beslutet tar vi när det behövs.

`tour_id` behåller Postgres-id:t tills migreringen är klar och klienten bytt till `_id`. Index: `{ tour_id: 1 }` unikt (uppslag under migreringen), `{ user_id: 1, started_at: -1 }` (profilens lista), `{ guide_id: 1 }` (turer per guide).

## Vad som stannar i Postgres
- **users** – inloggning och roller, referensen från allt annat. Behöver transaktioner och unika e-postadresser.
- **guides** – redaktionellt innehåll med sökning på titel/region; flyttar till CMS i M9, inte till Mongo.
- **photos** – hör till en tur men refereras från bildbearbetningen i M7 och ligger på disk/i objektlagring; behåller relationen `tour_id` tills vidare.

## Så här ska migreringen gå till (genomförs i M5)
1. Skript `api/src/db/migrate-tours.js`: läser alla turer ur Postgres med sina punkter (en fråga per tur är ok en gång), bygger dokumenten enligt modellen ovan, `insertMany` i batchar om 100. Idempotent via unikt index på `tour_id` + `upsert`.
2. Verifiering i samma skript: antal dokument = antal turer, summan av `stats.points` = antal rader i `tour_logs`, tre stickprov jämförda fält för fält.
3. `/api/tours` och `/api/tours/:id` byter källa till Mongo bakom samma kontrakt i `shared/` (typerna ändras inte i det här steget – klienten märker inget).
4. `tour_logs` lämnas orörd en vecka, sedan `drop table` i en egen PR när inget läser den.

## Alternativ vi jämförde
- **Allt kvar i Postgres, `logs` som `jsonb`-kolumn på `tours`.** Löser N+1 lika bra, en databas mindre att drifta. Talar emot: kursen kräver NoSQL, och vi hade inte fått öva på när dokumentmodellen faktiskt passar. Skulle vi valt utanför kursen hade det här varit ett starkt alternativ.
- **Allt till MongoDB.** Enklare miljö (en databas), men användare och guider har relationer och unika nycklar som Postgres hanterar bättre, och guiderna ska ändå bort till ett CMS.
- **MongoDB för turer, Postgres för resten** (valt). Två databaser, men varje typ av data ligger där den passar.

## Konsekvenser
Två databaser att starta, backa upp och ha i molnet (M6: Azure Database for PostgreSQL + Cosmos DB for MongoDB eller containrar – beslutas i hostingdokumentet). Två anslutningssträngar i miljön, redan i `config.js` och `compose.yaml`. Pipelinen behöver en Mongo-tjänst när integrationstesterna kommer i M5. `elevationGain` flyttar in i migreringsskriptet så att `stats.elevation_gain_m` räknas en gång vid skrivning, inte vid varje läsning.

**Skrivet av:** Anna Berg, tech lead period 1
