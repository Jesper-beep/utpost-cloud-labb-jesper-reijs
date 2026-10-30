# Beslutsdokument: API-stil

*Ett av teamets sex beslutsdokument. Skrivet i M4, hålls levande. (Det här är ett ifyllt exempel – ert eget ska bygga på era egna mätningar och argument.)*

**Datum:** 2026-10-16
**Beslut:** GraphQL kompletterar REST. Allt klienten *läser* för att rita en vy går via `/graphql`. Inloggning, bilduppladdning och health stannar i REST. REST-endpoints som bara den gamla React-klienten använder tas bort tillsammans med `web/` i M6.

## Bakgrund
Skuld 6: startsidan gör fem anrop och kastar det mesta av svaret. Uppmätt mot seedad databas (40 guider, 200 turer):

| Vy | REST: anrop | REST: byte | GraphQL: anrop | GraphQL: byte | Databasfrågor (API-loggen) |
|---|---|---|---|---|---|
| Startsidan | 5 | 30 894 | 1 | 5 599 | 4 |
| Turlistan | 1 | 271 150 | 1 | 6 831 | 132 |

Startsidan visar titel, landskap, svårighet och längd, men `/api/guides` skickar hela `body_html` för alla 40 guider. Turlistan visar fem kolumner, men `/api/tours` skickar alla mätpunkter för 50 turer.

## Schemat i korthet
Typerna `Guide`, `Tour`, `User`, `Photo`, `LogPoint`. Ingångar: `guides`, `popularGuides(limit)`, `guide(slug)`, `regions`, `tours(limit)`, `tour(id)` och mutationen `createTour(input)`. Fälten heter som klienten vill ha dem (`lengthKm`), inte som kolumnerna (`length_km`); översättningen ligger i fältresolvers. `User` har bara `id` och `displayName`: e-post och `password_hash` finns inte i schemat och går därför inte att fråga efter.

## Vad som går via GraphQL och vad som stannar i REST
- **GraphQL:** startsidan (klar i M4), turlistan, guidelistan och detaljvyerna (M5, med klientbibliotek och codegen).
- **REST:** `POST /api/auth/login` (ett anrop, ett svar, inget att välja fält i), `POST /api/photos` (filuppladdning är krångligt över GraphQL och flyttar ändå till en funktion i M7), `GET /api/health` (compose och Azure frågar med en vanlig GET).

## Alternativ vi jämförde
- **Laga REST:** en sammansatt `/api/home` och `?fields=` på listorna. Löser startsidan med lite kod och behåller HTTP-cachen. Talar emot: varje ny vy kräver en ny endpoint eller en ny parameter, och kontraktet i `shared/` växer för hand. Hade varit vårt val om klienten bara hade två vyer.
- **GraphQL för allt, REST bort:** ett sätt att prata med API:et. Talar emot: uppladdning och inloggning blir krångligare utan att något blir bättre, och health måste ändå vara en GET.
- **GraphQL för läsning, REST för resten** (valt).

## Konsekvenser
Två sätt att prata med API:et tills `web/` är borta. Klienten måste läsa `errors` i svaret, statuskoden är 200 även vid fel (`client/src/graphql.ts`). Turlistan kostar 132 databasfrågor med nuvarande resolvers (N+1), fler än REST-varianten per fält vi faktiskt visar: åtgärdas i M5 med mätning före och efter. Svarstyperna i klienten skrivs för hand och kan glida isär från schemat tills codegen finns (M5). HTTP-cache per URL fungerar inte för `POST /graphql`; cachning sker i klientbiblioteket (M5).

**Skrivet av:** Erik Lind, tech lead period 2
