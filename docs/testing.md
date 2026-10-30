# Teststrategi – Utpost

*Beslutsdokument, det första av teamets sex. Skrivet i M2, hålls levande. (Det här är ett ifyllt exempel – ert eget ska bygga på er `docs/debt.md` och era egna argument.)*

**Datum:** 2026-10-02
**Beslut:** Vi testar ren logik som enhetstester och vyer som komponenttester med Vue Testing Library. API:et mockas på modulnivå (`vi.mock('../api')`). Inga E2E-tester förrän appen kör i en miljö där de kan köras (M6). Varje buggfix får ett regressionstest.

## Bakgrund
Vi ärvde en klient utan ett enda test och ett API vars kontrakt bara fanns i huvudet på den som skrev det. Pipelinen från M1 kör ett röktest – den behöver något att köra. Sex vyer ska portas till Vue innan M6, och varje portering är en chans att införa en bugg som ingen märker.

## Nivåer
- **Enhet (Vitest):** funktioner utan Vue i sig – `lib/tours.ts` (höjdmeter, formatering), senare validering och datum. Millisekunder, inga mockar.
- **Komponent (Vitest + Vue Testing Library):** vyerna. Rendera, fråga som en användare (`getByRole`, `getByLabelText`), interagera med `user-event`. API-modulen mockad.
- **API (M5):** integrationstester mot GraphQL-servern med riktig databas – lokalt mot compose-databaserna, i pipelinen mot services. Ingen port, ingen mock: `yoga.fetch()` får samma request som browsern skickar.
- **E2E:** inte förrän M6. Då ett smoke-test mot staging.

## Karta: vad testas var

| Del av Utpost | Nivå | Varför just där? | Finns test i dag? |
|---|---|---|---|
| Höjdmeter (`elevationGain`) | enhet | ren beräkning, hade en bugg (saknad höjd = 0) | ja, 3 st inkl. regression |
| Kilometerformatering | enhet | ren funktion | ja |
| Guidevyn (lista + sök) | komponent | beteende i UI: filtrering, tom lista, fel | ja, 4 st |
| Turvyn (tabell) | komponent | nästa vy att porta – test skrivs i samma PR | nej |
| Turdetalj | komponent | beroende av `elevationGain` som redan är testad; kan vänta | nej |
| GraphQL-API:et (`api/src/graphql/`) | integration | resolvers mot riktig databas: N+1-regression, inloggningskrav, fel med 200, migreringen av loggar | ja, 6 st (M5) |
| `api.ts` | ingen egen | tre rader; testas indirekt genom komponenttesterna | – |
| Inloggning (Pinia-store) | enhet på storen | logik utan UI; komponenttest på LoginView när den portas | nej |
| Routern | ingen | Vue Routers beteende är inte vårt att testa | – |

## Regler
- En PR mergas bara när pipelinen är grön **och** ny logik har ett test som visar vad den ska göra.
- En buggfix kommer alltid med ett regressionstest som är rött före fixen. Skuldnumret från `docs/debt.md` står i testnamnet.
- Vi mockar API:et genom `vi.mock('../api')` i komponenttester – och sedan M5 `vi.mock('@urql/vue')` för vyer som läser via GraphQL. Aldrig `fetch` direkt, aldrig nätverket.
- Täckning: inget procentkrav. Ett täckningskrav mäter rader som körts, inte beteende som verifierats – vi hade hellre tio tester som fångar riktiga buggar än 80 % täckning av `console.log`. Vi kör `vitest --coverage` en gång i månaden för att hitta helt otestade filer.
- Testfiler ligger bredvid koden och heter `<fil>.test.ts`. Testnamn på svenska, i hela meningar: `it('hoppar över mätpunkter utan höjd …')`.

## Vad vi medvetet inte testar
Vue Router och Pinia (de har egna tester), CSS och klassnamn, exakt DOM-struktur, `api.ts` isolerat.

## Alternativ vi jämförde
- **Vue Test Utils rakt av** (det röktestet använde): närmare komponenten (`wrapper.vm`), lätt att testa implementation av misstag. Testing Library tvingar oss att fråga som användaren – vi valde den.
- **Täckningskrav 80 %**: ger ett tal att peka på, men belönar meningslösa tester. Valdes bort, se regel ovan.
- **E2E redan nu med Playwright:** hade gett störst trygghet, men appen kör inte någonstans utom lokalt än. Skjuts till M6.

## Konsekvenser
Vi får skriva en label på varje formulärfält (annars hittar inte testet det) – det är en fördel, inte en kostnad. Komponenttester tar sekunder, inte millisekunder: håll dem få och riktade. Den dagen API:et mockas på ett annat sätt (MSW?) skrivs den här filen om.

## Kommandon
`npm test` (klienten, en gång, som i pipelinen) · `npm run test:watch --workspace=client` · `npm run test:api` (integrationstesterna, kräver databaserna igång och seedade)
