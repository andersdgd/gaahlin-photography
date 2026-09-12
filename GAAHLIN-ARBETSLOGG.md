# Gaahlin Photography — ARBETSLOGG

**Dok-version:** 1.42
**Datum:** 2026-09-06
**Aktuell version:** Frontend: **PublicSite v0.12.3 (heron = introt: adminets bildspel i Rummet, ögon på ögon; tom lista ⇒ stillbilden; loggan i navet som inline-SVG) + Klippet v0.9.0 (Room med `intro`, `dwell`/`dissolveMs`, `poolFromSnapshot`; introt byter av sig självt; täcker höjden på mobil)** + index.css v0.6.3 (loggan, navet står still, isat glas) + Logo.jsx v0.1.0 + AdminApp v0.16.1 (intro-väljaren; adressen följer namnet) + siteContent.js v0.2.0 (`hero_pool`) + ClientApp v0.2.0 + BookingPage v0.1.0 + seeing.js v0.1.0 + credentials.js v0.1.0 + Spegeln v0.1.0 (`/spegeln`) + darkroom.js v0.1.0 (Obscura.jsx pensionerad, ej importerad) (router `App.jsx` v0.12.0, `supabase.js` v0.5.0, `vercel.json` v2 med redirects) · Backend: migrationer `0001`–`0007` (buckets `gaahlin-public` + `gaahlin-deliveries`, edge function `invite-client`) · SEO: `index.html`-meta (OG/Twitter/canonical) + `robots.txt` + `sitemap.xml`
**Förutsätter:** `DOKTRINEN.md` och `GAAHLIN-MASTER.md` — läs dem först.

---

## ⏭️ START HÄR — för nästa chatt

**Öppningsfras:**
> Ny chatt, Gaahlin Photography. Utför Startkontroll enligt MASTER avsnitt 8 innan vi börjar.

**Avslutsfras:**
> Avsluta chatt, Gaahlin Photography. Utför Avslutskontroll enligt MASTER avsnitt 9.

- **Läs först:** `DOKTRINEN.md` + `GAAHLIN-MASTER.md` + detta dokument. Bekräfta att de primära projektfilerna (`src/`-trädet) finns uppladdade.
- **Aktuell version:** Frontend: `src/App.jsx` (router) **v0.12.0** + `src/PublicSite.jsx` **v0.12.3** (heron = introt; loggan i navet) + `src/Klippet.jsx` **v0.9.0** (Room, intro-läge, mobilfyllning) + `src/lib/seeing.js` **v0.1.0** + `src/lib/credentials.js` **v0.1.0** + `src/Spegeln.jsx` **v0.1.0** + `src/lib/darkroom.js` **v0.1.0** (prototyp; Obscura.jsx pensionerad) + `src/lib/siteContent.js` **v0.2.0** + `src/index.css` **v0.6.3** + `src/Logo.jsx` **v0.1.0** + `src/admin/AdminApp.jsx` **v0.16.1** + `src/client/ClientApp.jsx` **v0.2.0** + `src/BookingPage.jsx` **v0.1.0** + `src/lib/supabase.js` **v0.5.0** + `vercel.json` **v2** (redirects). Backend: migrationer `0001`–`0007` applicerade. Buckets `gaahlin-public` (publik) + `gaahlin-deliveries` (privat). Edge function `invite-client` (ACTIVE). SEO-meta i `index.html` + `public/robots.txt` + `public/sitemap.xml`. Sajten live på `www.gaahlin.com`.
- **Stora skiftet senaste passen (2026-09-06, pass 5): underkänt, och en plan.** Anders om v0.2.0: *"detta var sämre … tar längre tid att få fram bilderna, tänk 50 bilder … detta var ett fusk och försök att ta 2010-teknik och sminka grisen."* Rätt. Obscura **v0.2.1** levererad: omedelbar scen som standard (bild synlig när den är laddad, 0,9 s i testbänken), mörkrummet bakom `?darkroom=1`. Anders mandat inför nästa chatt: *"planera att verkligen AMAZE ME … hur många steg du vill … fri användning av data … kör ALL OUT."* Svar: **`GAAHLIN-AMAZE.md`** (nytt styrdokument, 17 filer i manifestet): visionen *Rummet som ser* — perception i stället för dekoration: bildintelligens vid uppladdning (ögon, blick, ljusriktning, djup, tonalitet, embedding) i adminens webbläsare; matchklipp på ögonen; en klippare med Anders regler; kameran som blick (opt-in, lokal); relight ur djup; Rösten med verktyg; Spegeln v2 geometrisk; Närmare; trohet; kundrum — ett pass per chatt, mockup före kod, noll väntan, pixlar orörda. Nästa chatt: pass **8.1 Klippet**. MASTER 1.9 → 1.10.

### Omedelbara nästa steg

**NAVET STÅR STILL OCH ÄR AV GLAS — index.css v0.6.3 (Anders 2026-09-12: *"Navigeringen rör marginellt på sig när jag
börjar scrolla, den skall ju vara 'fixed' … snyggare om bakgrunden till navigeringen inte övergår till svart utan med
suddig/dimming som lite isat glas"*).** Rörelsen: navet ÄR fixed, men `.scrolled` bytte padding 1,8 → 1,2 rem med
transition, så innehållet gled 10 px. Borttaget — paddingen är konstant. Mobilens `nav.scrolled{padding:.9rem 1.5rem}`
tappade dessutom `env(safe-area-inset-top)` (notchen) — borttagen. Glaset: bakgrunden var `rgba(0,0,0,.95)` så
`blur(10px)` aldrig syntes; nu `rgba(0,0,0,.45)` + `blur(20px) saturate(1.2)` + hårfin linje `rgba(255,255,255,.07)` i
underkant. Bänk: loggans y 34,2 px före = 34,2 px efter scroll; glaset renderat över hero-bilden.

**LOGGAN — KORRIGERAD VÄG: INLINE-SVG (PublicSite v0.12.3 + index.css v0.6.2 + `src/Logo.jsx` v0.1.0).** Första leveransen
(nedan) pekade på en fil i `public/`. Två saker hände vid push: **1)** pubg skrev filen till `public/logo/` (inte
`public/images/logo/` som FILE:-raden sade) — v0.12.2 pekade om dit. **2)** pubg lämnade **`FILE:`-raden kvar** i filen
(verifierat på gaahlin.com: filen börjar med `FILE: public/images/…`) — ogiltig XML, tom logga. Lärdom, stående regel:
**pubg tar bara bort FILE:-raden för filer under `src/`; allt vi levererar går under `src/`, binärer och bilder lägger
Anders själv i repot.** Fix: loggan är en React-komponent `src/Logo.jsx` med path-datan inline (radbruten, 44 kB), `fill=
"currentColor"`, storlek via `.nav-logo svg`. Bättre teknik oavsett: ingen extra begäran, ritas med första målningen.
Bänk: 213×14 px dator / 183×12 px iPhone, vit, path ritad. `public/logo/gaahlin-photography.svg` är kvar men oanvänd —
`git rm` vid tillfälle.
**Driftsatt `e236e0d` 2026-09-12 20:49** (Klippet v0.9.0, AdminApp v0.16.1, index.css v0.6.1, PublicSite v0.12.2 + trasig
svg). **GitHub 403 på vägen:** Anders enda token var fine-grained *"gtd-crm push"* med bara Nexus-repot i listan, och
nyckelringen sparar en token per github.com — alla pub-kommandon skickade den. Löst på GitHub (All repositories, Contents
Read and write), inget lokalt. Repot är fortfarande **publikt** (bokikonen) — punkten står kvar.

**LOGGAN I NAVET — PublicSite v0.12.1 + index.css v0.6.1 + `public/images/logo/gaahlin-photography.svg` (Anders
2026-09-12: *"detta är min logga. Kan du använda denna och byta ut texten som står uppe i vänstra hörnet. men du måste
extrahera och invertera så den blir vit och syns"*).** Källa: `GAAHLIN_Logo.png` 3508×1272 RGBA, svart bläck. Bläcket
(mörkt och synligt) beskuret till 2861×188, spårat i cv2 på 4× uppskalad, lätt utjämnad mask (RETR_CCOMP + approxPolyDP
≈0,2 px), 23 konturer / 3 345 punkter → en `<path fill="#fff" fill-rule="evenodd">` så bokstävernas hål (O, P, A, R) blir
hål; de överlappande A:na och HY-ligaturen kom med. Granskad på svart i Chromium stor och i 13/16/20 px. Navet: `<a
class="nav-logo"><img src=… width=2861 height=188>` (proportionen känd innan filen laddats — inget hopp), 14 px hög på
dator (213 px bred), 12 px på mobil (183 px); ordmärkets typsnittsregler borta. Bänk: renderat i PublicSite på dator och
iPhone, loggan laddad, i linje med menyn/hamburgaren. **Även levererad utanför repot:** `gaahlin-photography-white.png`
(vit, genomskinlig, 2861×188) för Anders eget bruk. **Push-ordning:** SVG:n först (så bilden finns när koden pekar på den)
→ index.css → PublicSite. Katalogen `public/images/logo/` är ny — klagar pubg: `mkdir -p public/images/logo` först.

**ADRESSEN FÖLJER NAMNET — AdminApp v0.16.1 (Anders 2026-09-12: *"när jag skapar ett galleri med ett namn så går det inte att
ändra senare. Döpte om 'Portraits' till 'Intro' men det ändras inte."*).** Kontroll i databasen först: `title = 'Intro'`,
`slug = 'portraits'` — omdöpningen sparade titeln; adressen skapas bara vid nyskapande (`slugify`) och följde aldrig med, och
adminet visar den under namnet ("/portraits · publikt galleri"), så det såg ut som att inget hänt. Sajten använder aldrig
adressen (indexet och överlägget visar `title`; `slug` är bara Rummets serienyckel `s`). **Fix:** `saveEdit` sätter `slug =
slugify(titel)` med krockskydd — `galleries_slug_key` är UNIQUE — löpnummer mot övriga gallerier (intro, intro-2 …) och ett
andra försök vid 23505. **Datan rättad direkt i produktion** (Anders intention, reversibel, inget pekar på slug):
`update gaahlin.galleries set slug='intro' where id='6c2a1c77…' and slug='portraits' and title='Intro'` → 1 rad. Adminet
visar `/intro` vid nästa laddning även före push. `hero_pool`-ögonblicksbilden bär fortfarande `gal.slug='portraits'` —
harmlöst (används bara som serienyckel, och introt har inga kapitel); byts vid nästa sparning av väljaren.

**INTROT PÅ MOBIL TÄCKER HÖJDEN — Klippet v0.9.0 (Anders 2026-09-10, iPhone-skärmbild: *"På dator är introt nog stort men
på mobilen blir ansiktena så små att effekten/zoomningen inte ens syns. Kan vi på iphone göra bildspelet större så att det
täcker upp snyggare. Detta är enbart på mobilen."*).** Orsak: intro-bilderna är liggande 1,6:1 och `contain` i en stående ruta
fyller bredden — 390 px bred, 244 px hög, ansiktet 14 % av skärmhöjden (datorn: 45 %). **Fix:** `layout(p, W, H, fill)` —
i introt och en stående ruta (W < H) täcker en bild som är bredare än rutan `fill·H` av höjden i stället för bredden, med
ögonen mitt i bredden och på hänglinjen (bara nedåt: hjässan beskärs aldrig). Det som försvinner på sidorna är intro-bildernas
svarta bakgrund — Anders premiss ("dessa bilder kommer vara med svart bakgrund"). `TALL_FILL` 0,85 ⇒ ansiktet ≈ 42 % av
skärmhöjden med luft på sidorna; 1,0 ger huvudet kant i kant (provat i bänken — för nära för en portfolio, därför 0,85 som
utgångsläge). **Skruvas live:** `gaahlin.com/?fill=0.6` … `?fill=1.0`, sedan in i `TALL_FILL`. Liggande rutor (dator,
liggande telefon) och överlägget är byte för byte orörda (`fill=null` = contain). **Bänk (Playwright, iPhone 390×844 +
dator 1440×900, före/efter):** v0.8.1 mobil bild 244 px hög (det Anders såg) → v0.9.0 717 px (85 %); ögonen 195,0 px = mitt i
bredden, 42,0 % av höjden; x −327/y 100 ⇒ bara sidorna beskurna; ögon på ögon 0,015/0,011 px; datorn h 809 x 73 = h 809 x 73.
*Bänkfynd:* bänkens HTML saknade `<meta name="viewport">` (index.html har den) så "iPhone" lades ut på 980 px — mätningen var
fel, inte koden; metan tillagd, bänkregeln: **bänkens dokument ska ha sajtens `<head>`-metadata**. Allt grönt. **Inte
prövat:** hur beskärningen faller på Anders riktiga filer — ansiktenas bredd avgör hur mycket luft 0,85 ger.

**INTROT BYTER AV SIG SJÄLVT — Klippet v0.8.1 (Anders 2026-09-10, efter att 8.2 gått live: *"Ok, fungerar nu. Tackar.
Ändrade i Admin. Men kan du göra så när zoom-effekten är slut byts bild automatiskt."*).** Två buggar, båda reproducerade i
bänken före rättning och gröna efter. **1)** `onPointerMove` anropade `schedule()` vid varje musrörelse — filmens regel
"rörelse i rutan håller bilden" — och i introt betydde det att 6-sekundersnedräkningen började om vid varje pixel: så länge
muspekaren rörde sig över heron byttes bilden **aldrig**; zoomen tog slut, inget hände. Bänken körde utan mus och gick grön av
just det skälet. Reproducerat: 0 klipp på 9 s med musen i rörelse (bildtid 2 s); efter rättning 4. Nu: rörelse håller bara
filmen, introt går på sin egen klocka. **2)** `cutter.open(null)` väljer bilden med starkast närvaro i första serien — rätt för
filmen, fel för introt, som är Anders ordning. Syntes inte i första bänken (alla tre hade samma närvaro); med olika närvaro
öppnade den på bild 2. Nu: introt öppnar alltid på bild 1 i adminets lista. Hela intro-sviten grön på v0.8.1.
**Lärdom (Lag 7, bänkens sökrymd):** en bänk utan besökare ser inte en regel som lyssnar på besökaren. Hero-autoplay testas
hädanefter med pekaren i rörelse, och med olika närvaro i poolen. **Driftsatt 10:52–10:56:** siteContent `e16dd08`,
Klippet v0.8.0 `a75e897`, AdminApp `7f57ae8`, PublicSite `4d379b3` (via Terminal — klistra-in-skyddet slog till på
PublicSite igen, tredje gången: v0.11.1:s CSS-flytt av honeypot-maskeringen var alltså inte hela orsaken; signaturen är
okänd, Terminal-vägen är regeln för den filen). Bunten `index-BpIvzYbE.js` verifierad med `hero_pool`/`Intro-bildspel`/
`Stillbild`. Anders valde bilderna i adminet: **"fungerar nu"**. Kvar att pusha: **Klippet v0.8.1**.

**PASS 8.2 INTROT — LEVERERAD 2026-09-10, DRIFTSATT, ANDERS: "FUNGERAR NU".** Anders: *"Galleriet för 'porträtt', jag vill att du
byter ut HERO-bilden av mig i svartvitt och skapar exakt samma sak som porträttgalleriet istället. Så att de tre ansikten som nu
är det galleriet kommer upp ett ansikte i taget med zoom-effekten … bild 1 upp, zoomar och byter snyggt till bild 2 o.s.v. Så det
blir introt. Och då måste du även göra om i admin så att jag kan byta eller lägga till bilder i bildspelet … dessa bilder kommer
vara med svart bakgrund så att dom flyter snyggt som intro … skall förstås inte täcka upp hela skärmen som 'arbeten' gör utan
detta skall vara som svartvita bilden men att det snyggt skiftar bild och zoomar och sen tonar över till nästa bild. Subtilt,
snyggt och professionellt."* Mockup (interaktiv HTML med hans tre ansikten ur skärmbilderna, reglage för tid/övertoning/
andning, ögon på ögon av/på) visad; **verdikt ordagrant: *"Bygg detta, vi justerar live."***
**Byggt (fyra filer, ingen migration):** `lib/siteContent.js` v0.2.0 — fältet `hero_pool` (JSON-ögonblicksbild av bildrad +
galleri + intelligensens siffror, i ordning) + `parseHeroPool`/`serializeHeroPool`. `Klippet.jsx` v0.8.0 — prop `intro`
(bläddrar i poolens ordning via `cutter.step`; tonar ALLTID — regeln "svart möter svart → hårt klipp" hade klippt där han bett
om en övertoning, och alla hans intro-bilder står på svart; inga kapitel; fast bildtid utan tempo-/närvaroviktning; andning
genom bildens tid + dess uttoning; första bilden med sajtens inglidning 1400 ms; ingen serietitel/bevisknapp — hero-metan
säger redan Porträtt), props `dwell`/`dissolveMs` med URL-parametrarna `?dwell=`/`?dissolve=` så vi skruvar live på gaahlin.com
utan deploy, `poolFromSnapshot` (samma `poolEntry` som `fetchPool` — EN definition av poolposten), `RoomBoundary` med
`fallback` (heron får aldrig bli en felrapport), ingen omförsöksloop vid enbildspool. `AdminApp.jsx` v0.16.0 — Innehåll → Hero →
**Intro-bildspel**: väljare ur biblioteket (publika bilder i publika gallerier = sajtens regler), klick lägger till/tar bort,
‹ › ordnar, × tar bort, "● analyserad / ○ ej analyserad" (utan Analys kan övertoningen inte matcha ögonen), bilder som
försvunnit markeras "saknas" och faller bort vid nästa ändring; sparas med Innehålls Spara-knapp. `PublicSite.jsx` v0.12.0 —
`<Room mode="hero" intro pool={heroPool} dwell={6000} dissolveMs={1600} active={!roomOpen}>` i `#hero` när `hero_pool` har
bilder, annars stillbilden exakt som v0.11.1. **Ingen väntan:** poolen kommer ur `site_content` som heron redan inväntar
(`HERO_WAIT_MS`); `fetchPool` rör bara indexet och överlägget.
**Testbänk (AMAZE §7, Chromium via Playwright, React 19 CJS, stubbad Supabase som svarar med `hero_pool`, Anders tre ansikten
serverade via lokal HTTP med CORS):** PublicSite renderad på riktigt. Öppnad 610 ms efter sidladdning; bild 1 först; scenen
`absolute` i `#hero` (inte fixed); inglidning 0,73 → 1; klipp u1→u2→u3→u1 (loop, adminets ordning); alla klipp övertoningar;
`?dissolve=800` respekterat; inga kapitel trots olika gallerier; kanter 0,001 < 0,08 (på svart); klippintervall 2509/2511 ms
mot mål 2500; **ögon på ögon 0,000 / 0,000 / 0,019 px** i klippögonblicket; hänglinjen 42 % där krympbudgeten räcker, annars
mot underkanten (regeln, inte ett fel); andning inåt 1,000 → 1,022 på 1,5 s; ingen serietitel i heron; tom `hero_pool` ⇒
stillbild `settled`, inga klipp. **Kontrollprov:** med v0.7.1:s dissolve-regel återinförd går "alla klipp är övertoningar"
röd — checken mäter något. Allt grönt.
**Push-ordning (varje mellanläge är helt):** `src/lib/siteContent.js` → `src/Klippet.jsx` → `src/admin/AdminApp.jsx` →
`src/PublicSite.jsx` → dokumenten. Sedan i adminet: Innehåll → Hero → Intro-bildspel → välj de tre porträtten → Spara.
Fram till dess visar heron stillbilden som i dag. **Skruva live:** `gaahlin.com/?dwell=6000&dissolve=1600` (ms); värdena
Anders landar på skrivs in i `INTRO_DWELL_MS`/`INTRO_DISSOLVE_MS` i PublicSite. Andningens storlek är `BREATH` i Klippet.
**Inte prövat:** hur det ser ut med Anders riktiga filer (bänken kör ansikten ur skärmbilder, ögonen avlästa för hand) och på
telefon. Anders öga är beviset; verdiktet mot amaze-kriteriet loggas ordagrant.
**AMAZE 1.1:** 8.1 markerat KLART; **8.2 Introt ersätter 8.2 Blicken** (struken — förutsatte kameran som togs ur rummet);
§10 pekar på Anders ord för nästa pass. Frågan om 8.3 Relight står kvar.

**INGA FILTER PÅ FOTOGRAFIERNA — index.css v0.6.0 (Anders 2026-09-06: *"varje bild är matt i färgen. Vid mouse over
kommer färgen starkare … jag vill att den alltid är samma färg som originalbilden"*).** Galleriindexet renderade varje
bild genom `filter: grayscale(20%) brightness(.9)` och tände den till `grayscale(0%) brightness(1.02)` vid hover.
**Varken läget var originalet:** viloläget dämpat, hover-läget 2 % för ljust. Mätt enligt CSS Filter Effects: en hudton
(214,178,152) blev (187,161,143) i vila, och en specular (246,242,238) blev (221,218,215) — 25 nivåer av spegling borta
ur den bild vars hela poäng är att bevara dem. **Fix:** filtret borttaget ur båda lägena. Hover behåller `scale(1.04)`
— affordansen ska ligga i rörelsen, inte i exponeringen.
**Samma fel på två ställen till, båda åtgärdade i samma pass** (Lag 10 — lösningen gäller klassen, inte det
rapporterade fallet): `.about-image img` bar `grayscale(15%) brightness(.85)` och är nu ofiltrerad; den döda
STRIP-CSS:en (`#featured`/`.featured-strip`/`.strip-item`, renderas inte i någon JSX) bar ett tredje filter,
`grayscale(10%)`, som hade vaknat den dag remsan återinförs — hela blocket borttaget, det ligger i git-historiken.
**Stående regel skriven i MASTER §6** (Lag 5): ingen `filter` och ingen `opacity < 1` på en `<img>` som visar ett av
Anders fotografier — i vila, vid hover eller "subtilt". Tillåtet: geometri som hover-affordans, toningar som **landar**
på opacity 1, och `backdrop-filter` på nav/menyer (de ligger inte på ett foto). Regeln bär sin egen kontroll.
**Prövat:** `grep` på CSS-**kroppen** ger 0 filter i v0.6.0 mot 4 i v0.5.1; kontrollprovet med ett återinfört filter
går rött, så checken mäter något; klamrarna balanserade (112/112), noll tomma regler; diffen är fyra ställen.
*Not om kontrollen:* första körningen gick röd på fel grund — sökrymden var hela filen och träffade kommentarshuvudet
där filtren nämns i klartext. Sökrymden ska sammanfalla med påståendet (Lag 7); checken avgränsades till CSS-kroppen
och regeln i MASTER §6 bär den rättade formen. **Inte prövat:** hur sidan ser ut i webbläsaren — Anders öga är beviset.

**ANDNINGEN VÄND INÅT — Klippet v0.7.1 (Anders 2026-09-06: *"när jag öppnar galleribilder zoomar dom sakta ut lite … jag
vill vända att dom gör exakt samma sak men istället zoomar dom in"*).** Rörelsen han såg är `breathe()`: en långsam
skalning som startar i samma ögonblick bilden öppnas och pågår hela dwellen. Den gamla regeln lät ansiktets storlek
bestämma *riktningen* — täta porträtt drog utåt (0,95), oanalyserade utåt (0,97), bara mellanstora ansikten inåt (1,05).
Med sju bilder, mestadels täta porträtt och delvis oanalyserade, blev utfallet i praktiken "allt zoomar ut". **Fix:**
`target = p.sc > 0 ? 1 + BREATH : 1 + BREATH * 0.6` — ett håll, inåt, för alla. Dämpningen till 3 % på oanalyserad bild
står kvar: utan ansikte är andningens ankare en gissning, och en gissning ska röra sig mindre. Allt annat är byte för
byte oförändrat — start i `scale(1)`, dwellens längd (lägst 1500 ms), `cubic-bezier(.33,0,.67,1)`, ankaret i ögonen
förskjutet mot ljuset (`breathOriginOf`). **Start i `scale(1)` är inte valfritt:** matchklippet räknar B:s ögonläge mot
en inre nod i vila, så en andning som startade på annat än 1 skulle flytta klippet ur matchning (mätt till 0,008 px i
testbänken 2026-09-06 — den siffran skyddas här).
**Priset, räknat ur `layout()` + `breathOriginOf()` för fixturpoolen:** vid dwellens *slut* ligger ~3 % av bildens
underkant utanför ramen på laptop (1440×900) och 2–3 % av sidokanterna på telefon (390×780). Aldrig ögonen, aldrig
hjässan. Vilorektet är fortfarande obeskuret (`layout`, "aldrig beskuren"); det är andningens ändläge som inte är det.
Det är vad en inzoomning från en contain-passning kostar och går inte att undvika åt det hållet. Vill Anders ha den
mildare: sänk `BREATH` från 0,05.
**Prövat:** hela filen transpilerar rent (0 syntaxdiagnostiker; kontrollprovet med avsiktligt trasig kod gick rött, så
checken mäter något); riktningen uträknad för alla tre bildtyper (1,05 / 1,05 / 1,03 — inga utåt); inga `1 - BREATH`
kvar; `scale(1)`-starten intakt; diffen är fyra kodrader, varav en logik. **Inte prövat:** rörelsen i en webbläsare.
Testbänken byggdes inte — Anders bilder finns inte i denna chatt, och `1 + BREATH` är inte en ny kodväg utan den gren
som redan låg live för mellanstora ansikten sedan v0.4.0. Det är en avvikelse från AMAZE arbetsregel 5 och redovisas
som en (Lag 6). **Anders okulära kontroll är beviset.**

**Städat i samma leverans** (fynd ur Startkontrollen, "vi håller alltid rent omkring oss"): MASTER §3 hade **två**
poster för `src/Obscura.jsx` — den ena beskrev prototypen på `/obscura/scen`, en rutt som inte finns i App v0.12.0;
borttagen. MASTER §3 "Tre sektioner" sade AdminApp v0.14.0 (är v0.15.0) och PublicSite v0.11.0 (är v0.11.1); rättat.
`src/lib/supabase.js` saknade versionsnummer i leveranstabellen här; tillagt. MASTER 1.20 → 1.21.

**Hero-bilden tillbaka (Anders 2026-09-06: *"vi kan inte börja med galleri som kommer nedanför … gör att den glider in snyggt bara, subtilt"*).**
Levererat: **PublicSite v0.11.0** — heron är åter en stillbild ur `site_content.hero_image` (tomt fält ⇒ repo-filen
`/images/intro/me_bw.jpg`), som glider in med opacity 0→1 och scale 1,035→1 på 1400 ms, `cubic-bezier(.2,.7,.2,1)`,
startad av bildens egen `load` — aldrig en timer. Skala och inte förskjutning: `object-fit: contain` gör att en translate
hade blottat svarta kanter. Två noder: ytterdiven (`heroImgRef`) äger scroll-parallaxen, `<img>` inuti äger inglidningen —
på samma nod slåss de om `transform`. `HERO_WAIT_MS = 1200` gör att en hängande databas aldrig ger svart hero, och
`key={heroUrl}` gör att en sent inkommen URL glider in i stället för att poppa. **index.css v0.5.0** — `.hero-img` +
`.settled` + `prefers-reduced-motion` (400 ms ren toning, ingen skala); den gamla `transition:opacity .1s` bort (den hade
kortslutit inglidningen); död LIGHTBOX-CSS borttagen. **index.html** — `<link rel="preload" as="image">` på hero-filen.
Rummet är oförändrat kvar som galleriets visning i överlägg. **Adminet rördes inte:** `hero_image` fungerade hela tiden,
det var bara ingen som renderade bilden — fältet var föräldralöst, inte trasigt. Anders byter bild under
**Innehåll → Hero → Hero-bild**.
**Sidoeffekt:** heron väntar inte längre på den tunga `fetchPool`-frågan — klagomålet *"första bilden kommer efter
DB-frågan (ca 1 s)"* är därmed borta.
**Testbänk (Playwright + Chromium 1194, riktiga JPEG över lokal HTTP, hela PublicSite med stubbad supabase/Klippet och
riktig index.css): 25 kontroller, 0 röda.** Mätt: övergången 1,4 s på både opacity och transform med rätt kurva; 400 ms
in i rörelsen opacity 0,815 och skala 1,0065; vila på opacity 1 / skala 1; bilden verkligen dekodad (naturalWidth 2400);
parallaxen skriver bara på ytterdiven medan bildens transform står i vila; heron tonas vid scroll; inget rum i heron;
7 bilder i indexet; tryck öppnar överlägget på rätt `uid`; egen hero-bild ur `site_content` styr bilden och glider in
(bildsvaret fördröjt så mätningen inte blir en kapplöpning); hängande DB ger ändå hero på 1,5 s; reducerad rörelse ger
ingen skala; mobil 390 px fyller bredd och höjd; inga konsolfel.
**Två fynd ur testbänken, båda rättade före leverans:** (1) `fetchpriority` i gemener ger React-varningen *"Invalid DOM
property … Did you mean `fetchPriority`?"* → camelCase; (2) första mätningen av "poppar inte fram" var en kapplöpning
mot bildladdningen, inte ett påstående om koden → bildsvaret fördröjs nu i testet.

1. **Driftsatt och verifierat 2026-09-06.** `a076c40` index.css v0.5.0 → `3368358` index.html → `b2c1d83` index.css v0.5.1
   (167 rader) → `f216703` PublicSite v0.11.1 (631 rader). Produktionsbundlar: `index-DXQU-QLS.js`, `index-B7J9X8Bf.css`.
   CSS-filen läst i sin helhet från produktion — `.hero-img` (1,4 s, `cubic-bezier(.2,.7,.2,1)`), `.settled`,
   `prefers-reduced-motion` och `.hp-field` ligger uppe, ingen lightbox-CSS kvar. JS-bundeln bytte hash och commiten
   rörde bara `src/PublicSite.jsx` (57 insättningar, 9 borttagna); bundeln är inte läst rad för rad.
   **Kvar för Anders:** okulär kontroll att heron tonas upp och sätter sig, och att kontaktformuläret inte visar
   något "Website"-fält. **Dokumenten (denna fil 1.32 + MASTER 1.19) är ännu inte pushade.**
2. Kvar/justeringar: sju bilder ⇒ överläggets film upprepar sig snabbt (löses med fler bilder, inte med kod);
   `og:image` pekar på `me_bw.jpg` — stämmer så länge hero-fältet är tomt, men måste följa med om Anders sätter en egen
   hero-bild i adminet (samma sak gäller `<link rel="preload">` i `index.html`); Spegeln länkar till `/obscura` (→ `/`);
   `Obscura.jsx` kan `git rm`:as och ska bort ur projektfilerna (MASTER 1.16 tog bort den ur manifestet — 19 filer).
   Väntar på Anders ord: 8.2 Blicken förutsätter kameran som ströks; 8.3 Relight stryks ur AMAZE? `GAAHLIN-AMAZE.md`
   är kvar på 1.0 och pekar fortfarande på pass 8.1 som nästa — dokumentet ska skrivas om när riktningen är satt.
Kvar för Anders (oförändrat): HDR-export; Content Credentials i kameran; repots synlighet (`githubRepoVisibility: public`,
bekräftat på nytt 2026-09-06); sitemap i Search Console.

**Arc 7 — kvar (små):** verifiera galleri-layout + innehålls-CMS i prod (se 1.14/1.17); `index.html`-meta (titel/beskrivning säger "Stockholm" — bestäm stad och språk) och `og:image` som pekar på repo-filen `me_bw.jpg` även när hero-bilden byts; spamskyddet bevakas ~1 vecka.

**Arc 6 — ON HOLD** (2026-09-06, inga kunder just nu). Steg 2 klart och driftsatt (ClientApp v0.2.0). Kvar när det återupptas:

1. **Arc 6 steg 1 — Egen SMTP (hög prio).** Produktionen mejlar via Supabases default-tjänst (`noreply@mail.app.supabase.io`), som är rate-limitad och bara för utveckling — auth-loggarna är fulla av `429: email rate limit exceeded`. Anders väljer provider (Resend/Postmark/SES), skapar konto + API-nyckel; Claude bistår med konfig i Authentication → SMTP och verifierar via connectorns auth-loggar. Se Arc 6 under NÄSTA.
2. **Arc 6 steg 3 — End-to-end-test av `/kund`** när SMTP är på plats (bjud in testkund → mejl → inlogg → ser bara sina bilder; prova även utgången länk → begär ny).
3. **Valfri säkerhetshärdning.** `revoke execute` på `gaahlin.is_admin()` (testa på branch att policyerna håller), leaked-password-toggle, Turnstile på publika formulär (`/boka` + kontakt) mot spam.
4. **Liten öppen fråga:** `index.html`-metan är **svensk** ("Porträttfotograf i Stockholm"). Byt till engelska om internationell framtoning önskas — säg till.

*Kreativ roadmap (separat från ovan):* **OBSCURA-spåret under utvärdering** — designutforskning i tre mockuper (v1 template/WebGL-grid + proximity-typ, v2 spatial zoom + djup-parallax + slutarljud, v3 "The Screening": kapitel/serier, en bild i taget, scroll-scrub + snap, displacement-sömmar med per-serie-ton). v3 fick positiv respons — ev. framtida publik design. Även definierat: **bildskyddsstrategi** (webbupplösnings-derivat = verkligt skydd, deterrent-lager i `PublicSite`, vattenstämpel endast kundkorrektur) — ej byggt. Tidigare idélista (ThumbHash, lightbox, EXIF, print-shop): chatt 2026-06-14.

- **Öppna buggar / kända begränsningar:** Klippet: c2pa-js-verdiktet i rummet **oprövat** (samma kod som scenen); blickbedömningen (`gaze.direct`) i Analys är **inte tillförlitlig** och används inte av rummet; Obscura.jsx bär en egen kopia av c2pa-lite tills den byter till lib/credentials. Analys: MediaPipe från CDN **bekräftad i produktion** (0.10.14, GPU); blickregeln v2 (huvud + ögon) och trestegssökningen är prövade mot syntetiska meshar/canvas men **inte ännu mot Anders bilder** (nästa körning); posen ur matrisen visas inte längre (huvudets vridning tas ur meshens z i stället); tonalitet/ljus/fokus-fallback är luminansheuristik. Prototyperna: c2pa-js från CDN **oprövad** (fallback: "finns" utan verdikt); CORS på Storage för `fetch` och WebGL-texturer **oprövad** (fallback: nativ scen + "Kunde inte läsa filen"); Realtime-närvaro **oprövad** (fallback: raden visas inte); iOS kräver gest för `DeviceOrientation` (begärs vid första touch, oprövat); WebGL-scenen är SDR — HDR testas med `?native=1`. Repo-synlighet (`public` enligt Vercel) **att bekräfta**. Bokningsflödet (`/boka`) verifierat + röktestat ✓. **Auth-mejl går via Supabases default-tjänst — rate-limitad, ej produktionsklar** (åtgärdas i Arc 6). Kund-inloggningens friktion (utgången länk + OTP "signups not allowed") **härdad i ClientApp v0.2.0** — kvarstår att verifiera end-to-end när SMTP finns.
- **Åtgärdat 2026-09-06 (v0.11.0):** hero-bildfältet i Innehåll är verksamt igen; död lightbox-CSS borttagen ur `index.css`; heron väntar inte längre på `fetchPool`.
- **Låst innehållsbeslut:** publika galleribilder har **inga publika bildtexter** ("bilder är för att titta på, inte läsa om"). Redigerbar titel finns internt; `galleries.description` ligger vilande.
- **Designjusteringar längs vägen:** små UI-tweaks görs som patch-leveranser direkt.

---

## 🔧 Lärdomar — driftsättningsincident 2026-06-13 (Arc 4/5)

Vid `pubg` av Arc 4/5 blev produktionen **svart skärm**. Roten var **inte koden** utan utläggningen av filerna:

- **Felplacerad fil:** `AdminApp.jsx` hamnade i `src/` i stället för `src/admin/` → appen körde kvar gamla v0.10.0; nya v0.11.0 låg övergiven i `src/AdminApp.jsx` (importerades av ingen).
- **Kvarglömda `FILE:`-etiketter:** flera filer behöll min leverans-markör `FILE: <sökväg>` på rad 1. I en JSX-fil som faktiskt importeras är den ogiltig kod → bundeln kraschar (svart skärm). I robots/sitemap gav den ogiltig text/XML.
- **`index.html` deployades inte** i första försöket (låg inte i filuppsättningen) → den gamla SEO-fria shellen serverades fortfarande.
- **Diagnos:** via Vercel-connectorn hämtades den serverade HTML:en → skalet var korrekt (bundle-script + root-div fanns) men bundeln kraschade, och `index.html` var den gamla → slöt sig till rörig utläggning. Grep på versionsrader + `head -1` avslöjade fel mapp + kvarvarande `FILE:`-rader.
- **Fix:** flytta `AdminApp` till rätt mapp, ta bort orphan, `grep -v '^FILE:'` på alla berörda filer, verifiera rad 1, deploya. Sajten uppe igen.

**Permanent regel (även i MASTER §11):** vid varje `pubg` — lägg filen på **exakt** sökväg ur `FILE:`-raden, och **strippa `FILE:`-raden**. Verifiera med `head -1` att rad 1 inte börjar med `FILE:` *innan* push. En blank/svart React-sida med lyckat Vercel-bygge = nästan alltid en körnings-krasch i en importerad fil, inte HTML:en.

---

## 🔧 Lärdomar — Content Credentials i JPEG (2026-09-06)

- **Dekoration ≠ liv; latens är fienden.** Framkallning (3 s per bild), titelramar och lampvinjett gav ett rum som var *långsammare* än v0.1 och kändes som 2010. Det Anders vill känna är perception och omedelbarhet (AMAZE §1–2). Och: ett pass per chatt, mockup före kod — även när mandatet låter som "kör allt".
- **Testbänken finns i sandboxen:** Playwright + Chromium (`/opt/pw-browsers`), React 19 CJS-byggen, ett hand-rullat `require` i en HTML-fil, riktiga JPEG över `python3 -m http.server`, fejkad kamera (`--use-fake-device-for-media-stream`), WebGL via `--enable-unsafe-swiftshader`, ljud via `--autoplay-policy=no-user-gesture-required`. Skärmbilder granskas med `view`. Varje UI-leverans i Arc 8 körs där först.
- **`ev.currentTarget` i en fördröjd uppdaterare = krasch.** Läs synkront i handlern. Och: en repro utan riktiga bilder testar inte `onLoad`.
- C2PA-manifestet ligger i **APP11**-segment (`JP` + instansnummer + paketsekvens). **Fortsättningspaket upprepar boxhuvudet (LBox+TBox, 8 B)** — sätts segmenten ihop utan att strippa dem hamnar tolkaren mitt i miniatyr-JPEG:en. (Kostade en felsökning i passet; nu i `Obscura.jsx`.)
- Lightroom 9.5.1 skriver spec 2.4.0: `c2pa.claim.v2`, `c2pa.actions.v2`, `c2pa.ingredient.v3`, skapare i `cawg.metadata` (JSON), signatur som COSE med tidsstämpel i `sigTst2`. Åtgärderna är Adobe-parametrar (`com.adobe.acr`: ConvertToGrayscale, Contrast2012, Masking, Crop …) — det är dessa som gör "ingen generativ AI" till ett påstående med underlag.
- **Kedjan börjar där exporten börjar.** En export från en TIFF (`-Edit-Edit`) får TIFF som ingrediens — kamerans in-kamera-signatur ingår inte, hur signerad kameran än är. Vill man visa "Leica Q3 43" *signerat* måste Lightroom exportera från kamerafilen. EXIF-modellen är text vem som helst kan skriva.
- Adminens uppladdning bevarar bytes (`upload(key, file)`, ingen omkodning) ⇒ manifest och gain map överlever vägen till Storage. En framtida derivat-pipeline måste **återsignera** eller bära manifestet vidare — annars tappar derivaten sina credentials.
- **`pubg` läser urklippet — kopiera aldrig något efter filen.** Kvällens "inget att publicera" berodde på att kommandon kopierades ur chatten efter att filen lagts i urklipp. Sekvens: kopiera filen sist, skriv `pubg` för hand. Klistra aldrig in filen i Terminal — `pubg` hämtar den själv, och då ser macOS klistra-in-skydd ingenting.
- **Beprövade processer ändras inte för att lösa ett engångsproblem** (Anders 2026-09-06). `_deploy`/`pubg` delas av ett tiotal projekt. Ett externt hinder analyseras i den fil eller det urklipp som faktiskt orsakar det; loopen rörs bara efter uttryckligt beslut.
- **Kalibrera mot det verkliga, aldrig mot det syntetiska.** Blickregeln v2 var grön på syntetiska meshar och röd på Anders porträtt (1 av 3). Ett mått vars tröskelvärden satts utan riktiga, märkta exempel är en gissning med bevisets språk — och när samma sak faller en andra gång trots "verifiering" är det kontrollen som är trasig (Lag 7). Funktionen togs bort i stället för att lappas en tredje gång.
- **Nya moduler pushas före filen som importerar dem.** Två röda Vercel-byggen 15:45 ("Could not resolve ./lib/seeing") för att Klippet gick upp före sina lib-filer. Produktionen föll inte (Vercel byter inte till ett misslyckat bygge). Regel i MASTER §1.
- **Blick relativt huvudet är inte blick mot kameran.** Iris centrerad i ögonöppningen säger bara att ögat pekar dit huvudet pekar; ett porträtt som tittar bort med vridet huvud blev "direkt". Blicken mot objektivet är summan huvud + ögon — och den kan kontrolleras i utläsningen. Generellt (Lag 7): ett mått som bara sett frontala fall är prövat över en ofullständig population.
- **En detektor har en arbetsrymd.** Ett nästan svart porträtt (medel 0,014) gav "inget ansikte" — inte för att ansiktet saknades utan för att ingången låg utanför modellens rymd. Lösningen är att flytta *analysens kopia* in i rymden (nivålyft, större skala), aldrig fotografiet. Och mät aldrig "ljus" på hela en svart ram — utan ansikte pekar tonvektorn (mellanljust → ljusast) mot ljuset; ett fönster kring kontrast-tyngdpunkten hamnar på ljussidan och delar mitt i ljuset.
- **En tidsspärr som startar på 0 svalde det första klippet.** `if (now - lastCut < 300)` med `lastCut = 0` blockerar allt under sidans första 300 ms; en människa hinner sällan klicka så fort, testbänken gjorde det. Startvärde `-1e9`. Generellt: en spärr ska bara kunna utlösas av en händelse som faktiskt skett.
- **Analys kan bara delvis prövas här:** matematiken (ljusriktning, tonalitet, fokus-fallback, lum8, landmark-tolkning) prövades mot riktig canvas och syntetiska 478-punktsuppsättningar i Chromium; modellen från CDN kräver nät och är Anders test. Kroken `window.__klippetOnCut` mätte klippet på riktiga JPEG (nativ `<img>`) — 0,008 px.
- **Att mäta ett ögonblick i DOM:en (pass 6):** komponenten anropar `window.__klippetOnCut(info)` synkront i klippögonblicket (efter transform + tvingad layout, före första bildrutan) *bara om kroken finns*; testet läser `getBoundingClientRect()` på print-elementet just då och räknar B:s fokus i skärmkoordinater mot A:s — 0,000 px. För att *fotografera* ögonblicket: CDP `Animation.setPlaybackRate(0.02)` saktar ned CSS-övergången så skärmbilden hinner. Chromiums `favicon.ico`-404 i harnessen är harnessens, inte artefaktens.

---

## Dokumentlogg

| Dok-ver | Datum | Ändring |
|---------|-------|---------|
| 1.42 | 2026-09-12 | **Navet står still och är av glas (index.css v0.6.3); loggan som inline-SVG (Logo.jsx v0.1.0, PublicSite v0.12.3).** Navrörelsen var `.scrolled`:s paddingbyte — borttaget, paddingen konstant (mobilens scrolled-regel tappade även notch-marginalen); glaset 45 % svart + blur(20px) i stället för 95 % svart. Loggan: pubg skrev filen till `public/logo/` och lämnade FILE:-raden kvar (ogiltig XML) — loggan blev en React-komponent under `src/` i stället. **Stående regel:** allt vi levererar går under `src/`. Driftsatt `e236e0d`. GitHub 403 löst: fine-grained token med bara Nexus-repot → All repositories. Repot fortfarande publikt. |
| 1.41 | 2026-09-12 | **Loggan i navet.** Anders logotyp vektoriserad ur hans PNG (bläck spårat, vit fyllning, evenodd för hålen) → `public/images/logo/gaahlin-photography.svg`; ordmärket "Gaahlin" i navet ersatt av bilden (PublicSite v0.12.1, index.css v0.6.1: 14 px dator / 12 px mobil, width/height-attribut mot hopp). Granskad på svart i Chromium, renderad i sajtens nav på dator och iPhone. Vit PNG levererad separat. |
| 1.40 | 2026-09-12 | **Adressen följer namnet — AdminApp v0.16.1.** Anders: *"Döpte om 'Portraits' till 'Intro' men det ändras inte."* DB: title 'Intro', slug 'portraits' — titeln sparades, adressen (skapad bara vid nyskapande) stod kvar och visas under namnet i adminet. Sajten använder aldrig slug. Fix: slug följer titeln med krockskydd (UNIQUE) och löpnummer. Datan rättad i produktion: slug 'portraits' → 'intro' (1 rad). |
| 1.39 | 2026-09-10 | **Introt på mobil täcker höjden — Klippet v0.9.0.** Anders: *"på mobilen blir ansiktena så små att effekten/zoomningen inte ens syns … göra bildspelet större så att det täcker upp snyggare. Detta är enbart på mobilen."* `layout(p, W, H, fill)`: i introt och stående ruta täcker en liggande bild `TALL_FILL` 0,85 av höjden, ögonen mitt i bredden och på hänglinjen, bara sidorna (svart) beskärs, hjässan aldrig; `?fill=` skruvar live. Ansiktet 14 % → 42 % av skärmhöjden på iPhone; datorn och överlägget oförändrade (mätt). Bänken fick sajtens viewport-meta — utan den låg "iPhone" på 980 px. MASTER 1.24: §3 Klippet. Ersätter v0.8.1 i leveransen (v0.8.1:s två rättningar ingår). |
| 1.38 | 2026-09-10 | **Introt byter av sig självt — Klippet v0.8.1.** Anders efter driftsättningen: *"Ok, fungerar nu … Men kan du göra så när zoom-effekten är slut byts bild automatiskt."* Rotorsak: `onPointerMove → schedule()` startade om nedräkningen vid varje musrörelse (filmens "rörelse håller"), så introt bytte aldrig med pekaren över heron; bänken hade ingen mus och gick grön. Reproducerat (0 klipp/9 s), rättat (4 klipp/9 s). Andra buggen i samma körning: `cutter.open(null)` öppnade på starkaste närvaron, inte bild 1 — rättat för introt. 8.2 driftsatt: `e16dd08`/`a75e897`/`7f57ae8`/`4d379b3`, bunten verifierad, Anders: "fungerar nu". Klistra-in-skyddet slog till på PublicSite en tredje gång — CSS-flytten i v0.11.1 var inte hela orsaken; Terminal-vägen är regeln. Lärdom: hero-autoplay testas med pekaren i rörelse och olika närvaro i poolen. |
| 1.37 | 2026-09-10 | **Pass 8.2 Introt levererad.** Anders: *"byt ut HERO-bilden av mig i svartvitt och skapa exakt samma sak som porträttgalleriet istället … bild 1 upp, zoomar och byter snyggt till bild 2 o.s.v. … inte täcka upp hela skärmen som 'arbeten' gör utan som svartvita bilden … tonar över till nästa bild. Subtilt, snyggt och professionellt."* Mockup visad; verdikt: *"Bygg detta, vi justerar live."* Fyra filer, ingen migration: siteContent v0.2.0 (`hero_pool` som JSON-ögonblicksbild), Klippet v0.8.0 (`intro`: ordning, alltid övertoning, fast tid, `dwell`/`dissolveMs`, `?dwell=`/`?dissolve=`, `poolFromSnapshot`, `RoomBoundary fallback`), AdminApp v0.16.0 (intro-väljaren i Innehåll → Hero), PublicSite v0.12.0 (heron = Rummet med intro-poolen, tom lista ⇒ stillbild; ingen väntan på fetchPool). Testbänk i Chromium med PublicSite på riktigt: allt grönt, ögon på ögon 0,00 px, kontrollprov med gamla dissolve-regeln går röd. AMAZE 1.1: 8.2 Introt ersätter Blicken (struken). MASTER 1.23: §3 heron/filposter, §4 `hero_pool`. Push-ordning: siteContent → Klippet → AdminApp → PublicSite. |
| 1.36 | 2026-09-06 | **Inga filter på fotografierna — index.css v0.6.0.** Anders: *"varje bild är matt i färgen. Vid mouse over kommer färgen starkare … jag vill att den alltid är samma färg som originalbilden."* Galleriet körde `grayscale(20%) brightness(.9)` i vila och `grayscale(0%) brightness(1.02)` vid hover — varken läget var originalfilen. Mätt: specular 246 → 221 i vila. Filtret borttaget ur båda lägena; hover behåller `scale(1.04)`. Rotorsaken är en klass, inte ett fall: samma manér låg på `.about-image img` (`grayscale(15%) brightness(.85)`, borttaget) och i den döda STRIP-CSS:en (`grayscale(10%)`; hela blocket borttaget, renderas inte i någon JSX). **Stående regel i MASTER §6** med sin egen kontroll: ingen `filter`, ingen `opacity < 1` på ett fotografi; geometri, toningar som landar på 1 och `backdrop-filter` på UI-ytor är tillåtna. MASTER 1.21 → 1.22. Kontrollen fick rättas under passet: första formen läste hela filen och gick röd på kommentarshuvudet — sökrymden avgränsad till CSS-kroppen (Lag 7). |
| 1.35 | 2026-09-06 | **Andningen vänd inåt — Klippet v0.7.1.** Anders: *"när jag öppnar galleribilder zoomar dom sakta ut lite … jag vill vända att dom gör exakt samma sak men istället zoomar dom in."* Rotorsaken var inte ett fel utan en regel som blivit fel i sitt sammanhang: `breathe()` lät ansiktets storlek styra *riktningen* (tätt → 0,95 ut, mellan → 1,05 in, oanalyserad → 0,97 ut), en variation byggd för en stor pool. På sju bilder — mestadels täta porträtt, delvis oanalyserade — föll nästan allt i utåtgrenen. Fixen gäller hela klassen, inte det rapporterade fallet: `p.sc > 0 ? 1 + BREATH : 1 + BREATH * 0.6`, ett håll för alla. Rörelsen i övrigt orörd (start `scale(1)`, dwellens längd, `cubic-bezier(.33,0,.67,1)`, ankaret i ögonen mot ljuset). Ändläget beskär ~3 % av underkanten på laptop / 2–3 % av sidorna på telefon — mätt, inte gissat, och priset för att zooma in ur en contain-passning. Mätremsan i `?debug=1` säger nu "+5 % inåt" i stället för "±5 %". Testbänken kördes **inte** (inga riktiga bilder i chatten; `1 + BREATH` är en redan live gren sedan v0.4.0) — avvikelse från AMAZE arbetsregel 5, redovisad öppet. **Startkontrollens fyra dokumentfynd åtgärdade i samma leverans:** dubblettpost för `src/Obscura.jsx` i MASTER §3 borttagen (rutten `/obscura/scen` finns inte i App v0.12.0), AdminApp v0.14.0 → v0.15.0 och PublicSite v0.11.0 → v0.11.1 i "Tre sektioner", `supabase.js` fick sitt versionsnummer i leveranstabellen. MASTER 1.20 → 1.21. |
| 1.34 | 2026-09-06 | **Avslutskontroll.** Klippet v0.7.0 driftsatt av Anders: commit `a48aa07` 22:12, READY, ny JS-bundel `index-CCKCfWGR.js` (CSS oförändrad `index-B7J9X8Bf.css`, som väntat — ändringen rörde bara JSX). Bundeln är inte läst rad för rad; ordningen är bevisad i testbänken, inte i produktion — **Anders okulära kontroll av bläddringen återstår.** Självkonsistens-kontrollen fångade ett fel i leveransen av 1.33: leveranstabellen stod kvar på `Klippet.jsx` v0.6.0 medan rubriken och START HÄR sade v0.7.0. Rättat här. |
| 1.33 | 2026-09-06 | **Överlägget bläddrar i ordning — Klippet v0.7.0.** Anders: *"Bilderna skall komma i ordning … det skall gå från den man klickar på och medurs genom bilderna."* Buggen var inte slump utan sekvenserarens kollaps på en liten pool: `N = Math.min(8, floor(pool.length/2))` ⇒ **3** vid sju bilder, så bara tre reprisser blockeras; `ready`-filtret sållar bort oladdade; bruset är `rnd()*.1` mot regler värda 2–3 poäng. Kvar står tre–fyra kandidater och samma par vinner nästan varje gång — och lågkey-portfolion straffas dubbelt av regel 4 ("tre lika i skala", −1) och regel 5 ("två lågkey i rad", −1). **Fix:** `cutter.step(A, dir)` — index i poolen plus riktning, runt hörnet — används när `mode="overlay"`; `cutter.next` rörs inte. Vänsterpil bläddrar bakåt. `AUTOPLAY_IN_OVERLAY = false`: ingen automatisk framflyttning medan besökaren tittar. Match-klippningen mellan bilderna oförändrad. **Följd:** `cutter.next` anropas inte längre någonstans sedan heron slutade använda rummet (PublicSite v0.11.0) — Arc 8:s sekvenserare är oanvänd kod. Den raderas inte utan Anders ord. Testat: bläddring från alla sju startbilder framåt över varvet, bakåt runt hörnet, ett varv = alla sju utan dubblett, identiskt resultat med olika seed (ingen slump kvar) — 10 kontroller, 0 röda. |
| 1.32 | 2026-09-06 | **macOS klistra-in-skydd blockerar `PublicSite.jsx` — orsaken ligger i KOMBINATIONEN källa + innehåll, inte i någondera ensam.** Anders blockerades tredje gången ("Sabotageprogram upptäckt, klistra in blockerades"). Uteslutet med bevis: **källan** (`index.css` och `index.html` gick igenom från samma leverans, samma app, samma klippbord — commit `a076c40`, `3368358`), **storleken** (`pub` skrev 26 320 rader till my-things utan problem), och **honeypotten** (borttagen ur JSX i v0.11.1 — blockerades ändå). Ordförrådet i `PublicSite.jsx` jämfördes mot `App.jsx`, `Klippet.jsx` och `AdminApp.jsx` som passerar: inga e-postadresser, nycklar eller URL:er utom `w3.org/2000/svg`. Filen mättes ren: giltig UTF-8, inga kontrolltecken, längsta rad 155 tecken, noll träffar på `eval`/`atob`/base64/skalkommandon/långa blobbar. **Avgörande observation:** samma bytes passerade när klippbordet fylldes med `cat ~/Desktop/PublicSite.jsx \| pbcopy` — macOS gör en annan bedömning när klippbordets ägare är zsh än när det är ett chattprogram. **Varför just den här filen är fortfarande okänt.** Två felaktiga hypoteser ställdes och förkastades öppet under passet (honeypot-signaturen, sedan innehållet ensamt); den första ledde ändå till en ändring som behölls — se nedan. Driftsatt och verifierat: `b2c1d83` (index.css v0.5.1, 167 rader), `f216703` (PublicSite v0.11.1, 631 rader). CSS-bundeln `index-B7J9X8Bf.css` lästes i sin helhet från produktion: `.hero-img` med 1,4 s och rätt kurva, `.settled`, `prefers-reduced-motion` och `.hp-field` ligger uppe; ingen lightbox-CSS kvar. **Processfel i samma pass:** Claude skrev filerna men glömde `present_files` (MASTER §1 — leverans sker EXKLUSIVT så), och levererade sedan ARBETSLOGG 1.31 / MASTER 1.18 med honeypotten utpekad som rotorsak. Båda drogs tillbaka innan push och ersätts av 1.32 / 1.19; versionerna 1.31 och 1.18 finns därför inte i repot. |
| 1.31 | — | *Indragen före push: pekade ut honeypotten som rotorsak till klistra-in-blockeringen. Felaktigt. Ersatt av 1.32.* |
| 1.30b | 2026-09-06 | **Honeypottens maskering flyttad till `.hp-field` i index.css (PublicSite v0.11.1 + index.css v0.5.1).** Gjordes på en hypotes som visade sig fel — den löste inte blockeringen. **Ändringen behålls ändå:** ett dolt, bortpositionerat 1×1-fält inuti ett formulär är en känd nätfiskesignatur som skannrar reagerar på, och separationen JSX/CSS är rätt oavsett. Spamskyddet är oförändrat (handlern läser `data.get('website')`). Testbänken kontrollerar att fältet fortfarande är maskerat — går klassnamnet fel blir spamfältet **synligt** i kontaktformuläret. Verifierat i produktion: `.hp-field` finns i `index-B7J9X8Bf.css`. |
| 1.30 | 2026-09-06 | **Hero-bilden tillbaka, med inglidning.** Anders: *"lägg tillbaka min svartvita bild som första/hero/front igen … gör att den glider in snyggt bara, subtilt … och så det fungerar i admin att jag kan skifta bild vid behov."* Mockup visad och godkänd ("kör", 1400 ms / 3,5 %). PublicSite v0.11.0 (stillbild ur `site_content.hero_image`, `.settled`-inglidning startad av `load`, två noder mot parallax-krock, `HERO_WAIT_MS` 1200, `key={heroUrl}`), index.css v0.5.0 (`.hero-img` + reduced-motion; död lightbox-CSS bort), index.html (preload). **Adminet orört** — `hero_image` var föräldralöst, inte trasigt. Testbänk 25/0. Två fynd rättade före leverans: `fetchPriority` (camelCase) och en kapplöpning i själva testet. MASTER 1.16 → 1.17 (§3 hero-arkitektur, §11 tre lärdomar). |
| 1.29 | 2026-09-06 | **Rummet live.** PublicSite v0.10.0 driftsatt 18:40 (`a62091b`); bundeln verifierad: rummet inne, lightbox och kamera borta. Kvällens leverans i sin helhet: migration 0007 + Analys (AdminApp v0.15.0, blick v2 + trestegssökning), Klippet v0.1.0 → v0.6.0 (mockup → riktiga bilder → hänglinje/skalmatchat klipp/andning/kapitel → dissolve ur kanterna → Room i hero + överlägg), `lib/seeing.js`, `lib/credentials.js`, App v0.12.0. Avslutskontroll. |
| 1.28 | 2026-09-06 | **Leveransloop-incident (löst, ingen processändring).** macOS klistra-in-skydd blockerade `PublicSite.jsx` kopierad ur chatten; samma bytes ur lokal fil passerade ⇒ källan, inte innehållet. Claudes förslag på nytt deploy-skript (`pubgf`) **stoppat av Anders och tillbakadraget** — beprövade processer ändras inte. Orsak till "inget att publicera": `pubg` läser urklippet, som skrevs över varje gång kommandon kopierades ur chatten. |
| 1.27 | 2026-09-06 | **Rummet på startsidan — /obscura borttagen.** Klippet v0.6.0 = `Room` (hero/overlay, `startUid`, `onClose`, `active`, delad `preload`-cache, `open(uid)`), PublicSite v0.10.0 (rummet som hero + galleriets visning, lightbox bort, en poolhämtning), App v0.12.0 (rutter borta). Obscura.jsx pensionerad. Testbänk på hela startsidan grön. MASTER 1.15 → 1.16 (§3 rutter/filer, manifest 19 filer). |
| 1.26 | 2026-09-06 | **Klippet v0.5.0 — dissolve för bilder med bakgrund.** Anders: hårt klipp bär bara svart mot svart; med bakgrund blev det hackigt. Kantluminans mäts vid förladdning (`edgeLuminance`, `isDark` < 0,08, fallback `m` < 0,12); `dissolve = !(dark(A) && dark(B))`. Två bilder i DOM under övergången (`[prev, cur]` nycklade per bild, nodregister `nodes`), B: opacity 0→1 + transform matchad→vila 1 200 ms, A: opacity 1→0; kapitel med bakgrund genom svart (500/150/900); öppning med bakgrund tonas 900 ms. Debug-remsan visar läge och kant. Testbänk grön (se START HÄR). Ingen MASTER-ändring utöver §3-raden (1.15). |
| 1.25 | 2026-09-06 | **Anders tog styrningen — kameran bort, effekter ur geometrin (Klippet v0.4.0).** Blick v2 föll på riktiga porträtt (1/3); kameran och all blicklogik borttagen ur rummet; klipparen väljer på närvaro = ansiktets andel × (0,5 + 0,5·hårdhet). Nytt: `layout()` = hänglinje (HANG 0,42, HANG_MIN 0,85, aldrig beskuren), skalmatchat klipp (`s0 = A.sc·hA / (B.sc·hB)` klämt 0,7–1,8; vidbild `PANO_IN` 1,25; transform-origin = ögonen), andning (lager mellan klipp och närmare; mål 0,95/1,05/0,97 över bildens dwell, origo ögonen + 0,1·ansiktshöjd mot ljuset), kapitelandning (120 ms svart, ej vid reduced motion). Testbänk grön (ögon 0,02 px, storlek matchad, 42,0 % på alla porträtt, vidbild, kapitel, andning, reduced, mobil). Lärdomar: kalibrera mot det verkliga; push-ordning för nya moduler. MASTER 1.13 → 1.14 (§1 regel, §3). |
| 1.24 | 2026-09-06 | **Helheten — Klippet v0.3.0 på Anders beslut att slå ihop passen.** Tempo (`dwellFor`: bas × (0,8 + 2·sd) klämt 0,7–1,5, ×1,15 vid direkt blick, × besökarens takt 0,5–2 ur EMA av manuella klipp). Blicken: opt-in-knapp → `getUserMedia` → `loadLandmarker({ mode: 'VIDEO' })` → 15 fps `detectForVideo` → `parseFaces` (lib/seeing) → baslinje (median pitch/storlek av 20 rutor) → tittar inom ±22° → 600 ms hysteres → tittar håller filmen, blick bort klipper en gång (armed), ansikte borta återgår till dwell; luta fram +20 % ⇒ närmare 1,5×, tillbaka < +8 %. Närmare: pointer-håll 260 ms ⇒ `scale(2)` kring fokus (`transform-origin` = ögonen), släpp ⇒ tillbaka, ingen klipp; tapp/svep/hjul/tangent klipper som förut. Beviset: etiketten (nu knapp) → `loadCredentials` (lib/credentials) → panel med samma texter som scenen (`describeCredentials`), cache per bild, stängs av klipp/Esc. Wordmark hem uppe till vänster, opt-in uppe till höger, etikett på skuggsidan (ljus 90–270° ⇒ höger). Nya lib: `seeing.js` v0.1.0 (ur AdminApp v0.14.1), `credentials.js` v0.1.0 (ur Obscura v0.2.1, ordagrant + `describeCredentials`/`loadCredentials`). AdminApp v0.15.0 importerar seendet. MASTER 1.12 → 1.13 (manifest 20 filer, §3). |
| 1.23 | 2026-09-06 | **Analys mot riktiga bilder — två rotfel rättade (AdminApp v0.14.1).** Produktion: CORS grön, MediaPipe 0.10.14 laddad (GPU 2,1 s) från paketroten, 7/7 analyserade. Fynd 1: avvänd blick klassad "direkt" (irisoffset = ögon relativt huvudet) → blick v2 = huvud (meshens z) + ögon (80°/offset), ±12°/±25°; utläsning visar `huvud/ögon → blick`. Fynd 2: mörkt porträtt (medel 0,014) utan ansikte → trestegssökning (1280 → nivålyft → 2048), tröskel 0,3, min boxhöjd 3 %; ljus utan ansikte ur tonvektorn (fönster kring tyngdpunkten prövades och föll). INTEL_VERSION 2. Testbänk: syntetiska meshar med z, nivålyft, fejkad modell, ljusvektor i fem scener — grönt. Klippet oförändrat. Ingen MASTER-ändring. |
| 1.22 | 2026-09-06 | **Pass 8.1 byggt — riktiga bilder.** *"Kör med riktiga bilder."* Migration `0007` `gaahlin.image_intelligence` (jsonb faces/focus/tonality/light, `real[]` embedding — pgvector ej installerad, `models` jsonb med versioner/datum; RLS publik läsning där bild+galleri är publika, admin allt; applicerad via connectorn + verifierad, schemat har 9 tabeller). AdminApp **v0.14.0**: sektion **Analys** — CORS-sond, MediaPipe tasks-vision 0.10.14 via paketroten på jsDelivr (verifierad 2026-09-06; `vision_bundle.mjs` ger inga namngivna exporter), wasm + face_landmarker float16/1, GPU→CPU-fallback; per bild: ansikten (box, bildens vänstra/högra öga ur iris 468/473, blick = iris centrerad i ögonöppningen — huvudet får vara vridet, pose ca), fokus, tonalitet (48×48 Rec.709), ljusriktning ur ansiktsboxens luminansgradient (0 = höger, 90 = uppifrån, 180 = vänster) + hårdhet, lum8-embedding; upsert; utläsning på miniatyr. Klippet **v0.2.0**: pool ur DB (publika, `?g=`), intelligens invävd (oanalyserad ⇒ centrum/neutralt), förladdning + klipparen väljer bara laddade, öppning när laddad, nativ `<img>`, galleriets titel som etikett, `?fixtur=1`, DB-fel ⇒ fixturer med orsak; **buggfix** spärr-startvärde. Testbänk: riktiga JPEG i poolens proportioner, stubbad supabase, 404-bild, DB nere, `?g`, oanalyserade, mobil, reduced; Analys-matte mot canvas. MASTER 1.11 → 1.12 (§3, §4 0007/tabell/RLS, §11). |
| 1.21 | 2026-09-06 | **Pass 8.1 — mockup-grinden, levande.** Startkontroll: färskhet bekräftad via serverad bundle (v0.2.1-logik, `/spegeln`); `vector` finns men är inte installerad i Sandbox (instansbred ändring förbjuden §2) ⇒ `float4[]` enligt AMAZE. Visualizer-mockup av klippet → Anders bad om den som live-rutt. **`src/Klippet.jsx` v0.1.0** (ny): matchklipp på ögonen (B:s fokus placeras på A:s skärmposition, hårt klipp, glid 560 ms / 0 vid reduced motion), klipparen med partituret ur AMAZE §5 (seedad, regelspår), dwell-film som hålls av rörelse, tap/klick/svep/hjul/tangent, fixturpool (10 syntetiska prints, 3 serier), `?debug=1`/`?seed`/`?dwell`, felgräns. **`App.jsx` v0.11.0:** `/obscura` → Klippet, `/obscura/scen` → Obscura v0.2.1 (Spegelns länk pekar på `/obscura`). Testbänk (Playwright/Chromium, React 19 CJS): DOM-mätning i klippögonblicket 0,000 px i 5 klipp, alla interaktioner, dwell, mobil 390×844, reduced motion — inga fel. Dokumentloggen omsorterad i fallande ordning (hygienfynd). MASTER 1.10 → 1.11 (manifest 18 filer, §3 rutter, §8). |
| 1.20 | 2026-09-06 | **Underkänt + plan.** Anders underkände v0.2.0 (väntan, dekoration). Obscura v0.2.1: omedelbar scen standard, mörkrummet bakom `?darkroom=1`; testbänk 0,9 s till bild. Nytt styrdokument `GAAHLIN-AMAZE.md` v1.0 med visionen *Rummet som ser*, arkitektur i tre lager (seendet vid uppladdning, rummet, rösten), pass 8.1–8.8 med mockup-grindar och amaze-kriterier, klipparens regler ur Anders estetik, Röstens persona och verktyg, testbänkens recept, risker, förbud. MASTER 1.9 → 1.10 (manifest 17 filer, §8 läser AMAZE under Arc 8, §11 lärdom). |
| 1.19 | 2026-09-06 | **Incident + "levande" (Arc 8).** `/obscura` svart i Safari efter deploy; huvudsajten opåverkad. v0.1.1: felgräns + `?debug=1` gjorde felet läsbart på skärmen ("null is not an object (evaluating currentTarget.naturalWidth)"); v0.1.2 rättade (mått läses synkront i `onLoad`). Orsak till att repron missade det: bilderna laddade inte → `onLoad` fyrade aldrig; repron byggdes om med riktiga JPEG över lokal HTTP. Därefter riktningsbeslut: "amaze me" → princip *pixlarna orörda, allt runt lever, besökaren håller lampan*. Leveranser: `src/lib/darkroom.js` v0.1.0, `src/Obscura.jsx` v0.2.0, `src/Spegeln.jsx` v0.1.0, `src/App.jsx` v0.10.0; alla flöden verifierade i testbänken. MASTER 1.8 → 1.9. |
| 1.18 | 2026-09-06 | **Arc 8 — OBSCURA öppnad (experiment) + prototyp levererad + hygienfix.** Genomlysning av live-sajten (serverat skal via fetch, deployad källa, `gaahlin`-data: 3 gallerier/7 bilder, `site_content` tom ⇒ defaults). Fynd: innehållet är taket (7 bilder, generiskt manifest); klient-waterfall före första galleribild; gamla sajtens URL:er (`/gaze`, `/contact`, `/poncho`, `/blues`) kvar i Googles index med gammal beskrivning — svarade 200 via SPA-rewrite; en bildstorlek för alla skärmar; Vercel-meta anger repot som `public`. Koncept + teknikdomar (se Arc 8 i backloggen). **Filanalys** av Anders två exporter: porträttet bär C2PA (Lightroom 9.5.1, spec 2.4.0, skapare "Anders Gahlin", 13 åtgärder, signerat + tidsstämplat, källa TIFF ⇒ kamerasignatur ej i kedjan), ingen gain map; dyk-bilden helt utan metadata, 8000 px. Leveranser: `src/Obscura.jsx` v0.1.0 (ny), `src/App.jsx` v0.9.0 (`/obscura`), `vercel.json` v2 (308-redirects). Stående beslut: fynd hanteras direkt (MASTER §5). Färskhet bekräftad via Vercel: 9 prod-deployer 2026-09-05/06 = leveranssekvensen. Rättat: `index.css` saknades i huvudets versionsrad; MASTER §8 sa 12 filer (nu 14); backloggens "Arc 7 (ev.) kalender" kolliderade med Arc 7 = publika webbplatsen → omnumrerad **Arc 9 (ev.)**. MASTER 1.7 → 1.8. |
| 1.17 | 2026-09-06 | **Innehålls-CMS (Arc 7).** Migration `0006_gaahlin_site_content` applicerad via connectorn + verifierad (RLS, 2 policyer, grants anon/authenticated/service_role). Ny delad modul `src/lib/siteContent.js` v0.1.0 (FIELDS-schema, DEFAULTS för 5 språk = tidigare hårdkodad text, `fetchSiteContent`/`resolveContent`). AdminApp v0.13.0: sektion "Innehåll" — språkflikar, fält grupperade Hero/Manifest/Om mig/Kontakt, bilduppladdning till `gaahlin-public/site/`, upsert på `(key, locale)`, ersatta bilder städas ur storage. PublicSite v0.9.0: läser innehållet med fallback; redaktionella nycklar borttagna ur `langs` (UI-strängar kvar). MASTER 1.6 → 1.7: manifestet 13 filer (`siteContent.js` tillagd), §3 filstruktur, §4 migration/tabell/RLS/storage-prefix. |
| 1.16 | 2026-09-06 | **PublicSite v0.8.1 — spamskydd på kontaktformuläret.** Honeypot-fält `website` (offscreen, inte display:none), tidskrav ≥4 s från första fokus (`onFocus` på formuläret) till submit, spärr för meddelande >12 tecken utan blanksteg. Träff ⇒ tyst "skickat", ingen insert. Ingen CSS-/DB-ändring. |
| 1.15 | 2026-09-06 | **AdminApp v0.12.0 — ta bort kontakter.** Kontakter-vyn: kryssruta per rad, "Markera alla", "Ta bort valda (n)" + "Ta bort" per rad, allt via ConfirmModal; `delete().in('id', …)`. RLS `contacts_admin_delete` (is_admin) fanns redan — verifierat via connectorn. Bakgrund: 7 av 8 kontakter var bot-spam. Spamskydd på formuläret = nästa steg. |
| 1.14 | 2026-09-06 | **Arc 6 on hold, Arc 7 (publika webbplatsen) öppnad.** Justerad galleri-layout: PublicSite v0.8.0 + index.css v0.4.0. Rot: `.gallery-grid{columns:3}` (spaltflöde) — ensam bild vänsterställd, 3 bilder blev 2+1, spaltbalansering lät bilder läcka som avskuren remsa in i nästa galleri. Nu rader med gemensam höjd, bredd ∝ w/h ur DB (`flexGrow`+`aspect-ratio` inline), max 3/2/1 per rad (>900 / ≤900 / ≤500 px), ensam bild = centrerad hero (stående 55 %, kvadratisk 70 %, liggande 85 %), påbörjad sista rad krymps + centreras. Lightbox/lazy/reveal orörda. Ingen MASTER-ändring. |
| 1.13 | 2026-09-05 | **Arc 6 steg 2 — kund-inlogg-härdning (ClientApp v0.2.0)** + AdminApp v0.11.1 driftsatt. Startkontroll fann att v0.11.1 aldrig pushats (senaste prod-deploy 2026-06-13, bundeln visade v0.11.0:s navordning); Anders körde `pubg` (commit `e42dea7`), ny bundle verifierad via Vercel-connectorn. ClientApp v0.2.0: `shouldCreateUser: false` på OTP (bara inbjudna adresser får länk), fel-parametrar (`otp_expired`/`access_denied`) i URL:en fångas och förklaras med "Skicka ny inloggningslänk", svenska handlingsbara fel för "signups not allowed" + rate limit, "skicka igen"-flöde. Ingen MASTER-ändring. |
| 1.12 | 2026-09-05 | **AdminApp v0.11.1 + OBSCURA-designspåret + ⚠️ projektfil-regression upptäckt.** Admin-navet ommöblerat (`SECTIONS`: Bilder & gallerier överst, sedan Kontakter, Bokningar, Kunder; startvy oförändrad `'bilder'`). Bildskyddsstrategi definierad (webbupplösnings-derivat = verkligt skydd; deterrent-lager i `PublicSite`; vattenstämpel → kundkorrektur) — ej byggt, kandidat-arc. Designutforskning utanför repo: "Ljuset går upp" (befintlig identitet + GSAP) förkastad; **OBSCURA v1–v3** (template/WebGL-grid → spatial zoom + djup-parallax → "The Screening") — v3 under utvärdering som ev. framtida publik design. **Vid Avslutskontroll upptäckt: projektfilerna hade regredierat** (App v0.6.0, PublicSite v0.7.0, AdminApp v0.8.0, index.css v0.3.0, MASTER v1.5 — gamla kopior uppladdade av misstag under passet); återställningslista levererad, källa = repot. Ingen MASTER-ändring (kvarstår v1.6). |
| 1.11 | 2026-06-14 | **Arc 5 stängt + Arc 6 (SMTP) definierad.** Hela baksidan genomgången via Supabase-connectorn (strikt `gaahlin`-scope): RLS-modellen sund (bokningar kan skickas men ej läsas publikt, kunder ser bara sitt eget, ingen självupphöjning till admin), bokningarnas data-path bekräftad, edge fn `invite-client` ACTIVE (v3), admin-magiclink-inlogg OK. Bokningsflödet röktestat av Anders ✓ → **Arc 5 stängt.** Fynd: auth-mejl skickas men via Supabases default-tjänst (`noreply@mail.app.supabase.io`), rate-limitad/endast utveckling — loggar fulla av `429`. Plus kund-inlogg-friktion (utgången länk + OTP "signups not allowed"). → **egen SMTP + kund-inlogg-härdning lyft till Arc 6.** Säkerhetsadvisors: inga ERROR; `is_admin()`-exponering + "INSERT always true" på publika formulär = by design/valfri härdning. Ingen kodändring. |
| 1.10 | 2026-06-14 | **Projektfil-hygien + manifest spikat.** Projektfilerna städade och kompletterade till §3-manifestet: 12-filers arbetsyta (3 styrdok + `App`/`PublicSite`/`BookingPage`/`admin/AdminApp`/`client/ClientApp`/`lib/supabase`/`index.css` + `index.html` + `vercel.json`); migrationer, edge-fn, `package.json`/`vite.config`, `robots`/`sitemap` → Git-only referens. Manifest + skärpt §3/§7/§8/§9 inskrivet i MASTER (räkna upp ändrade arbetsyte-filer vid varje leverans). De gamla App v0.6.0 / PublicSite v0.7.0 / AdminApp v0.8.0 ersatta ur repot; `BookingPage`/`ClientApp`/`index.css`/`index.html` tillagda. Ingen kodändring. MASTER 1.5 → 1.6. |
| 1.9 | 2026-06-13 | **Arc 5 — bokningsförfrågningar + Arc 4 — SEO, driftsatt.** Migration `0005` (`gaahlin.bookings`). BookingPage v0.1.0 (`/boka`). AdminApp v0.11.0 (Bokningar-flik). PublicSite v0.7.1 (Boka-länk). App.jsx v0.8.0 (`/boka`-rutt). `index.html`-meta (OG/Twitter/canonical) + `robots.txt` + `sitemap.xml`. Driftsättningsincident (felplacerade filer + `FILE:`-etiketter) löst. MASTER 1.4 → 1.5. |
| 1.8 | 2026-06-13 | **Arc 1 + Arc 3 — kunder & privata leveranser.** Admin UX-polish (prompt/confirm → inline `EditRow` + `ConfirmModal`; AdminApp v0.9.0). Migration `0003` (deliveries omstrukturerad, privat bucket `gaahlin-deliveries` + storage-policyer). Edge function `invite-client`. AdminApp v0.10.0 (Kunder + leveranser per kund). Migration `0004` (service_role-grant — buggfix). ClientApp v0.1.0 + App.jsx v0.7.0 (kund-vy `/kund`). **B08/B09/B10 KLART.** MASTER 1.3 → 1.4. |
| 1.7 | 2026-06-13 | **Stort arkitekturskifte + ikapp-loggning.** Router-split (App.jsx → PublicSite/AdminApp), B04/B04b/B05 klara, admin-auth + tre buggfixar, **galleri-CMS i Storage + DB (B06/B07)**: migration `0002`, bucket `gaahlin-public`, AdminApp v0.8.0, PublicSite v0.7.0. MASTER 1.2 → 1.3. |
| 1.6 | 2026-06-10 | B03 låst, B01 klar (schema `0001`, fem RLS-tabeller, `is_admin()`). |
| 1.0–1.5 | 2026-05-28 | Uppsättning, Vite/React-grund, domän, B02-portering (se nedan). |
---

## Aktiva feature flags (rollback)

Inga än.

---

## Versionshistorik

- **PublicSite v0.11.0 + index.css v0.5.0 + index.html** (2026-09-06) — hero-bilden tillbaka som stillbild med subtil inglidning (opacity 0→1, scale 1,035→1, 1400 ms, `cubic-bezier(.2,.7,.2,1)`, startad av `load`); adminets hero-fält verksamt igen; rummet kvar som galleriets överlägg; se dokumentlogg 1.30.
- **Klippet v0.6.0 + PublicSite v0.10.0 + App.jsx v0.12.0** (2026-09-06) — rummet på startsidan; se dokumentlogg 1.27.
- **Klippet v0.5.0** (2026-09-06) — övergång per bildpar: klipp (svart+svart) eller dissolve; genom svart vid kapitel; tonad öppning; se dokumentlogg 1.26.
- **Klippet v0.4.0** (2026-09-06) — kameran bort; hänglinje, skalmatchat klipp, andning, panorama-avslöjande, kapitelandning, närvaro-klippare; se dokumentlogg 1.25. Tre transform-lager: klipp (translate+scale, origo ögonen) → andning (scale, origo mot ljuset) → närmare (scale, origo ögonen).
- **Klippet v0.3.0 + seeing.js v0.1.0 + credentials.js v0.1.0 + AdminApp v0.15.0** (2026-09-06) — helheten; se dokumentlogg 1.24. Pekarmodell: `onPointerDown/Move/Up/Cancel` ersätter click/touch (tapp < 460 ms utan rörelse = klipp, svep uppåt > 40 px = klipp, håll ≥ 260 ms = närmare); `-webkit-touch-callout: none` + `contextmenu` stoppad så håll inte öppnar bildmenyn. `holdRef` håller filmen (närmare eller blick). Kameran stoppas vid avmontering. `<video>` 2×2 px osynlig, `playsInline muted`.
- **AdminApp v0.14.1** (2026-09-06) — Analys v2: `headPose()` (yaw ur z-skillnad mellan bildens vänstra/högra kind över deras x-avstånd, pitch ur panna/haka), `gaze = { direct, offset, head, dir }` med `EYE_DEG = 80`, `DIRECT_H = 12`, `DIRECT_V = 25`; `normalizedCopy()` (histogram, gain så p99,5 → 217, max ×8); `detectFaces()` i steg 1280 → nivålyft → 2048 → 2048 nivålyft, `tier` i `models`; `minFaceDetectionConfidence`/`minFacePresenceConfidence` 0,3; box < 3 % förkastas; `lightFromTones()` (centroider för ≥ 0,6·max resp. 0,15–0,6·max, vektor mellan dem, `dir.z` = 1 − styrka); `analyzeImage()` ersätter `analyzeCanvas()`; `describeIntel` visar huvud/ögon → blick och söksteg. INTEL_VERSION 2.
- **Klippet v0.2.0** (2026-09-06) — riktiga bilder. `fetchPool(gSlug)`: galleries+images (publika, galleriordning; `?g=` via RLS) + `image_intelligence` → pool `{ id, uid, s, title, r, url, f, d, l, sc, m, h, e, intel }` med `NEUTRAL` för oanalyserade. `similar()` = cosinus > 0,85 på lum8 när båda har embedding, annars samma serie. `rank(..., ready)` filtrerar på laddade; `next()` returnerar `null` när inget laddat finns → 250 ms-retry. Förladdning via `new Image()` per bild; `loadedCount` driver öppningen; `<img objectFit: fill>` i vilorekten (aspekt ur DB). Etikett = `title`. `?fixtur=1`. DB-fel → `FIXTURES` + orsak i `caught`/remsan. Spärrar startar på `-1e9`.
- **AdminApp v0.14.0** (2026-09-06) — sektion Analys (nav: Bilder & gallerier, Analys, Innehåll, Kontakter, Bokningar, Kunder). Konstanter `MP_VERSION`/`MP_MODULES`/`MP_WASM`/`MP_MODEL` med datum. `loadImageCors`, `toCanvas` (långsida 1280), `luminanceGrid` (48×48), `tonalityOf`, `lightOf`, `contrastCentroid`, `lum8`, `parseFaces` (index 33/133/159/145, 263/362/386/374, iris 468/473; sortering på x; `direct` = |offset_x| < 0,18 ∧ |offset_y| < 0,35), `loadLandmarker` (paketrot → `+esm`; GPU → CPU), `analyzeCanvas`, `describeIntel`, `Readout` (canvas-överlägg). Upsert `onConflict: image_id`, `models` med app-version.
- **Migration `0007`** (2026-09-06) — `0007_gaahlin_image_intelligence.sql`, applicerad via connectorn + verifierad: `gaahlin.image_intelligence` (PK/FK `image_id` cascade, `version`, `faces`, `focus`, `tonality`, `light` jsonb, `depth_path`, `embedding real[]`, `models` jsonb, `analyzed_at`), RLS `image_intelligence_public_read` (bild+galleri publika) + `image_intelligence_admin_all`, grants, `notify pgrst`. Repo-kopia: `supabase/migrations/0007_gaahlin_image_intelligence.sql`.
- **Klippet v0.1.0 + App.jsx v0.11.0** (2026-09-06) — pass 8.1, levande mockup på `/obscura`. `layout()` (contain på svart) + `focusAt()` ger fokus i skärmkoordinater; `createCutter(pool, seed)` = partituret (blickslag var tredje, matchklipp 2·(1−d) + ögon +1, ljusets löpning 4–6 → vändning, skala tätt/vitt, två lågkey/mörk löpning/ljusaste efter mörkt, serie 2–4 + korsklipp på blick, uppmärksamhet ur dwell >4 s / <1 s, brus 0–0,1, ingen repris inom N=min(8, pool/2), reprisspärren släpps om allt är spärrat); `open()` = regel 8. Klippet: React renderar B i vila, `useLayoutEffect` flyttar den (utan övergång) så fokus ligger på A:s skärmposition, tvingar layout, nästa bildruta glider till vila; ringen (bara `?debug=1`) följer. Dwell-film: `setTimeout(dwell)`, `pointermove` skjuter upp, `visibilitychange` pausar; 300 ms-spärr mot dubbelklipp, 700 ms för hjul. Fixturpool: 10 prints som flata SVG-toner (hårt ljus = två ytor, ögon = två punkter). Ingen DB, inget nät. Scenen från v0.2.1 orörd, nu på `/obscura/scen`.
- **Obscura v0.2.1** (2026-09-06) — `nativeMode` standard (`?darkroom=1` aktiverar mörkrummet); etikett "Omedelbar scen"; inget annat ändrat. Underkännandet av v0.2.0 loggat i START HÄR och MASTER §11.
- **darkroom.js v0.1.0 + Obscura v0.2.0 + Spegeln v0.1.0 + App.jsx v0.10.0** (2026-09-06) — Mörkrummet: WebGL1, en kontext, `drawPrint(tex, rect, opts)` med alfa-blandning; shader = framkallning (density = 1−L, fbm-"kemi", tidig mjukhet, papper 0,90/0,885/0,86, `paperIn`), lampa (pöl `exp(-d²·3.2)`, sheen ∝ L^2.4, `spot` för Spegeln), Gaahlin-kurva (smoothstep 0,07–0,96, S-kurva, mjuk knä), korn. Obscura v0.2.0: `tick` ritar prints med `dev` från `devSince[i]` (2 800 ms), `paperIn` 320 ms, lampan lerpar mot markör/touch/lutning och andas (Lissajous) efter 3,5 s stillhet; print-parallax ±6 px och glid vid byte; laddar-`<img crossOrigin>` → textur; nativ fallback vid saknad WebGL/CORS-fel; ljud (`createSound`: två oscillatorer + brunt brus, lågpass, LFO; `tone()` ur 48×48-luminans); närvaro via `supabase.channel('obscura-room')`; `?native=1`. Spegeln v0.1.0: `getUserMedia` → `<video>` → textur per ruta → spot+kurva+spegling; `capture()` fryser i 2D-canvas → framkallning 3 200 ms → `save()` via `toBlob` (preserveDrawingBuffer) → `gaahlin-spegeln.jpg`; kameran stoppas vid fångst/avmontering; felgräns. Prövat i Chromium: shader-stadier, rummet över tid, lampa, panel, ljud på, Spegelns hela flöde inkl. nedladdning (146 kB).
- **Obscura v0.1.1 → v0.1.2** (2026-09-06) — felgräns (`Boundary`), `?debug=1`-remsa, öppningsram synlig inline, NaN-vakt, scrollTop-nollning, `-webkit-user-select`; v0.1.2 rättade `onLoad`-läsningen av `ev.currentTarget` (kraschen).
- **Obscura v0.1.0 + App.jsx v0.9.0 + vercel.json v2** (2026-09-06) — Arc 8, prototyp på `/obscura`. Ramar = öppningstitel + per galleri (kapiteltitel + bilder); fast scen med alla bilder absolut placerade, transparent snap-scroller ovanpå; opacitet/skala ur scrollavstånd (`fade`: platå ±0,2, dissolve till ±0,8), rAF-throttlat, ingen React-rendering per scroll. Bilder laddas för aktiv ±1. Per aktiv bild: `fetch` → `readCredentials` (JUMBF/CBOR: claim generator, spec, skapare via `cawg.metadata`/CreativeWork, åtgärder summerade på svenska, generativ-flagga, ingredienser, `stds.exif`, signatur + tidsstämpel), `readHdr` (XMP `hdrgm` / MPF), `readExif` (Make/Model/Software), sedan c2pa-js från jsDelivr (`c2pa@0`, Wasm + worker) för signaturverdikt med 12 s timeout — misslyckas den står "Content Credentials finns" kvar, aldrig "verifierade". Panel (dl) med Skapare/Signerat av/Verifiering/Åtgärder/Generativ AI/Kedja/EXIF (osignerat)/Bild. Teknikremsa: `dynamic-range`, `color-gamut`, `navigator.gpu`, `animation-timeline`. Tangentbord, punkter, reduced motion. `?g=<slug>` för enskilt/dolt galleri (RLS avgör). Prövat: JSX-syntax (TypeScript-transpilering), modulutvärdering + render mot verklig manifestdata i Node; parsern mot Anders export (13 åtgärder, TIFF-ingrediens), syntetisk gain map-markör, negativt fall. **Oprövat:** CDN-laddning av c2pa-js, CORS på Storage, HDR under `opacity`. Router: `/obscura`. `vercel.json`: `redirects` (permanent) för `/gaze`, `/contact`, `/poncho`, `/blues` → `/`, före `rewrites`.
- **Migration `0006`** (2026-09-06) — `0006_gaahlin_site_content.sql`, applicerad via connectorn + verifierad. `gaahlin.site_content` (PK `key, locale`, `value`, `updated_at`), RLS `site_content_public_read` (alla) + `site_content_admin_all` (is_admin), grants, trigger `touch_updated_at`. Repo-kopia: `supabase/migrations/0006_gaahlin_site_content.sql`.
- **siteContent.js v0.1.0** (2026-09-06) — ny delad modul `src/lib/siteContent.js`.
- **AdminApp v0.13.0** (2026-09-06) — sektion Innehåll (nav: Bilder & gallerier, Innehåll, Kontakter, Bokningar, Kunder).
- **PublicSite v0.9.0** (2026-09-06) — redaktionellt innehåll från DB med fallback; hero-bild/om-mig-bild kan bytas.
- **PublicSite v0.8.1** (2026-09-06) — spamskydd: honeypot + tidskrav + slumpsträngsspärr i `handleSubmit`; `formFirstFocusRef`. Tyst avvisning.
- **AdminApp v0.12.0** (2026-09-06) — Kontakter: borttagning enskilt och i bulk (kryssrutor), ConfirmModal, felvisning via `ui.err`. Inga andra sektioner rörda.
- **PublicSite v0.8.0 + index.css v0.4.0** (2026-09-06) — Arc 7: justerade galleri-rader. `useColumns()` (3/2/1 efter viewport), `chunkRows()`, `rowWidthPct()`; `.gallery-row` flex med `flexGrow = w/h` och `aspect-ratio` per bild → gemensam radhöjd. CSS `columns` borttaget. Placeholder-`minHeight` för lazy-bilder borttagen (aspect-ratio håller platsen).
- **ClientApp v0.2.0** (2026-09-05) — Arc 6 steg 2, kund-inlogg-härdning. `signInWithOtp` får `shouldCreateUser: false` (auth-användare skapas enbart via edge fn `invite-client`). Ny `readLinkError()` läser `error`/`error_code` ur hash/query vid landning, städar URL:en och visar begripligt meddelande + knapp "Skicka ny inloggningslänk". `authErrorText()` översätter Supabase-fel (signups not allowed → adressen saknar kundkonto; 429 → vänta). Efter utskick: "Inget mejl? … skicka igen". Inga ändringar i gate, leveransvy eller lightbox.
- **AdminApp v0.11.1 deployad** (2026-09-05, commit `e42dea7`) — levererad förra passet, pushad först nu. Verifierad i serverad bundle.
- **Migration `0005`** (2026-06-13) — `0005_gaahlin_bookings.sql`, applicerad via connectorn + verifierad. `gaahlin.bookings` (`id`, `name`, `email`, `phone`, `shoot_type`, `preferred_date`, `message`, `status` default `'ny'`, `created_at`). RLS: `bookings_public_insert` (anon + authenticated får skapa förfrågan, som contacts) + `bookings_admin_all` (admin läser/ändrar status/raderar via `is_admin()`). `service_role` ärver åtkomst via `0004`:s default privileges. Repo-kopia: `supabase/migrations/0005_gaahlin_bookings.sql`.
- **BookingPage v0.1.0 + App.jsx v0.8.0** (2026-06-13) — **publik bokningsförfrågan på `/boka`** (Arc 5). Formulär (namn, e-post, telefon, typ av fotografering, önskat datum, meddelande) → insert i `gaahlin.bookings` (anon via RLS). Brand-anpassad, fristående inline-stil, svensk v1, success-state. Routern (`src/App.jsx`) fick `/boka` → `<BookingPage />`. Ingen kalender/betalning — ren förfrågan (kalender/betalning = ev. Arc 7).
- **AdminApp v0.11.1** (2026-09-05) — admin-nav ommöblerad: Bilder & gallerier överst, sedan Kontakter, Bokningar, Kunder. Startvy oförändrad (`'bilder'`).
- **AdminApp v0.11.0** (2026-06-13) — **Bokningar-sektion** (Arc 5). Lista inkomna förfrågningar (nyaste först) med statuspiller (Ny/Bekräftad/Genomförd/Avböjd) + radera; mejl/telefon klickbara. Återanvänder UI-tokens. *Obs: filen hamnade fel vid första driftsättningen — se Lärdomar.*
- **PublicSite v0.7.1** (2026-06-13) — **"Boka"-länk** i nav + mobilmeny → `/boka` (Arc 5). Flerspråkig via inline-map på `currentLang` (Boka/Bestill/Book/Varaa/Book).
- **SEO: `index.html`-meta + robots + sitemap** (2026-06-13) — **Arc 4**. `index.html` fick title, description, Open Graph + Twitter-kort (hero `me_bw.jpg` som delningsbild), canonical, theme-color, og:locale — **statiskt**, eftersom delningsbotar (Facebook/LinkedIn/iMessage) inte kör JS. `public/robots.txt` (tillåt publikt, blockera `/admin` + `/kund`, peka på sitemap) + `public/sitemap.xml` (`/` + `/boka`). Den publika sajten är **en** sida (alla gallerier på startsidan) → ingen prerender behövdes.
- **ClientApp v0.1.0 + App.jsx v0.7.0** (2026-06-13) — **kund-vyn på `/kund`** (Arc 3c). Magisk länk-inloggning, gate (inloggad **och** har en kund-rad via RLS `clients_self_select`), kundens egna leveranser i rutnät med lightbox + nedladdning via tidsbegränsade signed URLs (`createSignedUrl` med `download`). Inbjudningslänken landar här (tokens konsumeras automatiskt). Routern fick `/kund/*` → `<ClientApp />`. Storage-policyn `gaahlin_deliveries_client_read` ger kunden läsning av bara sin egen `<kund-uid>/`-mapp.
- **Migration `0004`** (2026-06-13) — `0004_gaahlin_grant_service_role.sql`, applicerad + verifierad. **Buggfix:** `gaahlin`-schemat hade gett rättigheter till `anon`/`authenticated` men **glömt `service_role`** → edge-funktionens privilegierade anrop nekades *"permission denied for schema gaahlin"*. Ger `service_role` USAGE + alla tabell-/sekvens-/funktionsrättigheter + default privileges för framtida objekt. `service_role` kringgår RLS men måste ändå ha schema-USAGE för PostgREST. Repo-kopia: `supabase/migrations/0004_gaahlin_grant_service_role.sql`.
- **Edge function `invite-client` (v3)** (2026-06-13) — kundinbjudan server-side (Arc 3b). Deployad via connectorn (`verify_jwt: true`, ACTIVE). Admin-gated: anroparen bevisar admin via sin **egen** inloggning (RLS, kan inte förfalskas). Skapar/adopterar auth-användaren via service_role (`inviteUserByEmail` redirect `/kund`; finns e-posten redan adopteras kontot via `listUsers`) och upsertar `gaahlin.clients` (idempotent). Repo-kopia: `supabase/functions/invite-client/index.ts`.
- **AdminApp v0.10.0** (2026-06-13) — **Kunder + privata leveranser** (Arc 3b). Kunder-sektion: lista + bjud in (e-post + namn → `supabase.functions.invoke('invite-client')`) + ta bort (städar Storage). Klicka en kund → hantera leveransbilder: ladda upp till **privata** `gaahlin-deliveries` (nyckel `<kund-uid>/<uuid>`), ordna ▲▼, döp om, radera. Miniatyrer via signed URLs. "Leveranser"-fliken borttagen.
- **Migration `0003`** (2026-06-13) — `0003_gaahlin_deliveries_storage.sql`, applicerad + verifierad. Slängde vestigial `deliveries.image_id`, lade `sort_order`/`width`/`height` + index; skapade **privat** bucket `gaahlin-deliveries` (`public = false`, 50 MB); storage-policyer `gaahlin_deliveries_admin_all` + `gaahlin_deliveries_client_read` (`(storage.foldername(name))[1] = auth.uid()`). Platt modell: en delivery-rad = en bild. Repo-kopia: `supabase/migrations/0003_gaahlin_deliveries_storage.sql`.
- **AdminApp v0.9.0** (2026-06-13) — **admin UX-polish** (Arc 1, B09 + B10). `window.prompt`/`confirm` ersatta av återanvändbar `EditRow` (inline titel-redigering för gallerier **och** bilder) + `ConfirmModal`. En titel per objekt; inga publika bildtexter (låst).
- **Backend-schema `0002`** (2026-06-13) — `0002_gaahlin_galleries_storage.sql`, applicerad + verifierad. `gaahlin.galleries` (slug/title/sort_order/is_public) med RLS; omstrukturerade `gaahlin.images` (slängde fritext-`category`, lade `gallery_id` FK→galleries cascade, `width`, `height`, index); skärpte `images_public_read`; återkallade anon-skrivning. Bucket `gaahlin-public` (publik, 20 MB) + policy `gaahlin_public_admin_write`. Repo-kopia: `supabase/migrations/0002_gaahlin_galleries_storage.sql`.
- **AdminApp v0.8.0** (2026-06-13) — fullt **galleri-CMS**. Gallerihantering (slugify, döp om, ordna ▲▼, publik/dold, radera) + bilduppladdning per galleri rakt till Storage (mått klient-side, nyckel `<slug>/<uuid>.<ext>`, insert i `gaahlin.images`). Radering städar Storage. Verifierad live.
- **AdminApp v0.6.1–0.6.2** (2026-06-13) — admin-gate + tre buggar: (1) **auth-lås-fällan** (roles-kollen ut ur `onAuthStateChange`); (2) **PostgREST schema-cache 503** (`notify pgrst, 'reload schema'`); (3) **Safari-autofyll** (okontrollerat fält + ref).
- **PublicSite v0.7.0** (2026-06-13, **deploy-bekräftad**) — galleriet **DB-/Storage-drivet**. Hämtar publika gallerier + bilder, bygger publika Storage-URL:er, renderar varje galleri som eget block, lightbox över alla bilder. Hero/om-mig pekar på repo-sökvägar. Behåller nav, i18n, parallax, kontaktformulär.
- **PublicSite v0.6.0 + App.jsx-router** (tidigare session) — appen splittad för routing; portfolion bröts ut till `src/PublicSite.jsx`. `vercel.json` SPA-rewrite.
- **B04/B04b/B05** (tidigare session) — `VITE_*`-env i Vercel; `gaahlin` exponerat; `src/lib/supabase.js`; kontaktformulär via `gaahlin.contacts`. Bootstrap-admin (anders@gaahlin.com). Magic-link-redirect allowlistad.
- **Backend-schema `0001`** (2026-06-10) — `0001_gaahlin_init.sql`: schemat `gaahlin`, fem RLS-tabeller, `is_admin()` (`SECURITY DEFINER`, fast `search_path`).
- **v0.4.0 / v0.3.0 / v0.2.0 / v0.1.0** (2026-05-28) — B02-portering, Vite/React-grund + domän, projektuppsättning.

---

# BACKLOG — återstående åtgärder

## ✅ KLART

- **B01** — Supabase-schema med RLS (migration `0001`). 2026-06-10.
- **B03** — Admin-rollsdesign via `gaahlin.roles` + `is_admin()`. 2026-06-10.
- **B04 / B04b** — Miljövariabler i Vercel + `gaahlin` exponerat. KLART.
- **B05** — Kontaktformulär via `gaahlin.contacts`. KLART.
- **B06** — Bildadmin → fullt **galleri-CMS** (AdminApp v0.8.0). KLART 2026-06-13.
- **B07** — Supabase Storage för publika bilder (bucket `gaahlin-public`, migration `0002`). KLART 2026-06-13.
- **B08** — **Kunder + Leveranser (restricted).** Privat bucket `gaahlin-deliveries` (`0003`), edge function `invite-client`, admin-kunder (AdminApp v0.10.0) + kund-vy `/kund` (ClientApp v0.1.0). KLART 2026-06-13. *Kund-vy end-to-end-test + SMTP → Arc 6.*
- **B09 / B10** — Admin UX-polish + redigerbara bildtitlar. KLART 2026-06-13.
- **Arc 4 — SEO.** `index.html`-meta (OG/Twitter/canonical/theme-color), `robots.txt`, `sitemap.xml`. KLART 2026-06-13.
- **Arc 5 — Bokningsförfrågningar.** Migration `0005` (`gaahlin.bookings`), BookingPage (`/boka`), AdminApp v0.11.0 (Bokningar), PublicSite Boka-länk. KLART 2026-06-13. **Backend-verifierat + röktestat 2026-06-14 → stängt.**

## 🟡 NÄSTA

### Arc 8 — OBSCURA: visningsrummet  ← AKTIV (experiment, 2026-09-06)
**Tes:** försprånget ligger inte i hur sajten rör sig utan i (1) **trohet** — bilden visas bättre än någon annanstans: HDR via JPG gain map (Safari 26+/Chrome renderar HDR, Firefox och SDR-skärmar visar basbilden), en bild i taget på svart; (2) **bevis** — varje fotografi bär Content Credentials som verifieras i besökarens webbläsare (märket är inte en bildtext — det låsta beslutet står); (3) **auktorskap + egen infrastruktur** — kapitel i stället för feed, kundrum med urval/kommentarer/live-visning (Supabase Realtime), bokning som brief och nåbar för AI-agenter.
**Teknikdomar (prövade mot den här sajten, inte mot hur de låter):** HDR gain map **ja, kärna** · C2PA + c2pa-js (Wasm) **ja, kärna** · Baseline-CSS (scroll-driven animations, View Transitions same-document, Navigation API) **ja**, ersätter JS-parallax/GSAP · Wasm för derivat i adminen vid uppladdning (wasm-vips: AVIF/WebP-storlekar + gain map) **ja** · Astro (islands) för den publika ytan **ja** när serierna får egna URL:er med delningskort · Next.js/RSC, Qwik **nej** (fel form) · WebGPU **villkorat** — bara om HDR-canvas verifieras i alla tre motorer; trohet går före effekt, scenen bygger på nativ `<img>` + CSS · WebXR **nej** · Edge-compute: redan där (CDN); edge functions för signed URLs + agent-endpoint · Agent-nåbar bokning (MCP-endpoint, JSON-LD, `llms.txt`) **ja** · AI-concierge **senare, bara med Anders röst** · hyperpersonalisering **nej** · djupzoom (tiles, 60 MP) kandidat.
**Sekvens (bindande om Arc 8 går vidare):** prototyp verifierad på HDR-skärm → innehåll (Anders) → bildpipeline (derivat vid uppladdning, Wasm) → ny publik yta (Astro + "The Screening" + C2PA-märke + serie-URL:er) → kundrum (återöppnar Arc 6: SMTP före första riktiga kund) → agent-endpoint + brief-flöde. Fyra–sex arcs, inte en leverans.
**Status:** v0.2.0 underkänd av Anders (dekoration, väntan); v0.2.1 = omedelbar scen (nu `/obscura/scen`). **Pass 8.1 byggt:** 0007 + Analys (AdminApp v0.14.0) + Klippet v0.2.0 med riktiga bilder på `/obscura` — Anders kör Analys och ger verdiktet. Djup (Depth Anything V2) och CLIP är medvetet *inte* med i 8.1 (djup = förberedelse till 8.3, CLIP behövs först av Rösten 8.4; kolumnerna finns). **Arc 8 omplanerad i `GAAHLIN-AMAZE.md`:** 8.1 Klippet → 8.2 Blicken → 8.3 Relight → 8.4 Rösten → 8.5 Spegeln v2 → 8.6 Närmare → 8.7 Trohet & fart → 8.8 Kundrummet. Ett pass per chatt. **Inte:** AI-animering av fotografierna, genererade varianter, uppfunnen detalj, effekter som kostar tid framför bilden.

### Arc 6 — Egen SMTP + kund-inlogg-härdning  ← ON HOLD (Anders 2026-09-06), återöppnas av kundrummet i Arc 8
**Varför:** produktionen mejlar via Supabases inbyggda tjänst (`noreply@mail.app.supabase.io`), som är rate-limitad och endast för utveckling (auth-loggar fulla av `429: email rate limit exceeded`). Utan egen SMTP når kundinbjudningar och inloggningslänkar inte fram pålitligt.
**Scope:**
1. *(kvar)* Egen SMTP-provider (Resend / Postmark / AWS SES) konfigurerad i Authentication → SMTP. *Kontoskapande + nycklar gör Anders (Claude rör aldrig credentials); Claude bistår med konfig och verifierar via connectorns auth-loggar.*
2. ✅ `shouldCreateUser: false` på OTP-anropet i `ClientApp.jsx` + bättre UX för utgången/ogiltig länk (begär-ny-länk). **Klart — ClientApp v0.2.0 (2026-09-05).**
3. *(kvar)* End-to-end-verifiering av `/kund` (inbjudan → mejl → inlogg → kunden ser bara sina bilder).
*Avgränsning: gör inte om auth-modellen; bygg på befintlig magisk länk + RLS `clients_self_select`.*

### Arc 9 (ev.) — Bokning: kalender & betalning *(hette "Arc 7 (ev.)" t.o.m. 1.17 — omnumrerad, Arc 7 = publika webbplatsen)*
Om/när det behövs: tillgänglighetskalender (fotografen sätter tider, kund väljer tid), bekräftelsemejl, ev. depositions-/betalningsintegration (Stripe — känsligt flöde, Claude rör inga betaluppgifter). Större bygg — eget scope-samtal.

## 🟢 LÅG / HORISONT

- Galleri-cover-bild (`cover_image_id` ej infört; just nu = första bilden).
- Städa bort obsoleta `Gallery1–8.jpg` ur repot (ersatta av CMS:et; finns i git-historik).
- Dedikerad OG-bild (1200×630) i stället för hero — valfri putsning.
- Per-rutt-OG (kräver prerender) om `/boka` m.fl. ska ha egna delningskort — ej nödvändigt nu.
- BookingPage i18n (just nu svensk) om flerspråkig bokningssida önskas.
- Fotografi-assistent-app ("legendarisk mentor", Live Assist iOS + Leica-tethering) — egen, längre horisont.

---

## Pågående utanför appen

- **Sandbox är en levande delad instans.** Co-tenanten `roma` arbetas på parallellt av sin egen ägare; tabellantal där kan ändras utan att det rör oss. Vårt arbete är schema-isolerat till `gaahlin` + bucket-scopat till `gaahlin-public` och `gaahlin-deliveries`.
- **Auth-mejl går via Supabases default-tjänst (rate-limitad).** Verifierat via connectorns auth-loggar: utskick fungerar mekaniskt men `429`-strypning är vanlig → ej produktionsklart för skarpa kundinbjudningar. Egen SMTP = Arc 6.
- **Auth Site URL** i Sandbox pekar (ofarligt) på en annan co-tenants URL; gaahlin-login funkar via allowlistad redirect `https://www.gaahlin.com/**`. Rör inte Site URL.
- **GitHub-repots synlighet:** Vercels deploy-metadata anger `githubRepoVisibility: public` (2026-09-06). Inga hemligheter i repot (anon-nyckeln är publik by design, `service_role` finns bara i Supabase), men källkod, migrationer och hero-bilder är då läsbara för alla. Anders bekräftar/sätter private på GitHub.
- **Googles index bär gamla sajtens sidor** (`/gaze`, `/contact`, `/poncho`, `/blues`, beskrivning "Preserving beauty & immortalizing moments…", cookie-banner). 308:ar nu till `/` via `vercel.json` v2. Fler gamla URL:er kan finnas — Search Console visar dem.

---

## Levererade fristående dokument & artefakter

| Fil | Vad | Status |
|-----|-----|--------|
| `GAAHLIN-MASTER.md` | Masterdokument | Uppdaterat 2026-09-10 (v1.24) |
| `GAAHLIN-ARBETSLOGG.md` | Arbetslogg | Uppdaterad 2026-09-12 (v1.42) |
| `GAAHLIN-AMAZE.md` | Planen för Arc 8: vision, arkitektur, pass 8.1–8.8, klipparens regler, Rösten, testbänk | Uppdaterad 2026-09-10 (v1.1: 8.1 klart, 8.2 Introt ersätter Blicken) |
| `src/Klippet.jsx` | Rummet som komponent (`Room` hero/overlay; **`intro`**: ordning, alltid övertoning, fast tid, `dwell`/`dissolveMs`, `?dwell=`/`?dissolve=`; `poolFromSnapshot`; överlägget bläddrar i poolordning) — hänglinje, klipp/dissolve ur kanterna med ögon- och storleksmatchning, andning **inåt**, genom svart vid kapitel, klipparen med tempo och närvaro, Närmare (håll), beviset på begäran, delad förladdning; `?fixtur=1` | v0.9.0 levererad 2026-09-10 (ej pushad; ersätter v0.8.1 som inte pushats); v0.8.0 driftsatt `a75e897` |
| `src/lib/seeing.js` | Seendet: MediaPipe-konstanter, `loadLandmarker`, `parseFaces`/`headPose`, blickregeln — delas av Analys och rummet | Levererad 2026-09-06 (v0.1.0) |
| `src/lib/credentials.js` | c2pa-lite (JUMBF/CBOR, HDR, EXIF, c2pa-js-verdikt) + `describeCredentials`/`loadCredentials` | Levererad 2026-09-06 (v0.1.0) |
| `src/Obscura.jsx` | Pensionerad 2026-09-06 (ingen rutt, ej importerad; kan tas bort ur repot) | v0.2.1 |
| `src/Spegeln.jsx` | Prototyp `/spegeln` — besökaren i Gaahlins ljus (webbkamera, på enheten) | Levererad 2026-09-06 (v0.1.0) |
| `src/lib/darkroom.js` | WebGL-motor: framkallning, lampa, Gaahlin-kurva, korn | Levererad 2026-09-06 (v0.1.0) |
| `index.html` | Vite-skal + SEO-meta (OG/Twitter/canonical) + preload av hero-bilden | Levererad 2026-09-06 |
| `src/App.jsx` | Router (`/`, `/boka`, `/spegeln`, `/admin/*`, `/kund/*`) | Levererad 2026-09-06 (v0.12.0) |
| `src/PublicSite.jsx` | Publik portfolio — **heron = introt** (`<Room mode="hero" intro>` med `hero_pool`; tom lista ⇒ stillbild med inglidning), galleriet som index → rummet i överlägg, spamskydd (honeypot maskerad via CSS), DB-innehåll | v0.12.3 levererad 2026-09-12 (ej pushad); v0.12.2 driftsatt `e236e0d` |
| `src/lib/siteContent.js` | Schema + defaults + läsare för redaktionellt innehåll; `hero_pool` + `parseHeroPool`/`serializeHeroPool` | Levererad + driftsatt 2026-09-10 (v0.2.0, `e16dd08`) |
| `supabase/migrations/0007_gaahlin_image_intelligence.sql` | image_intelligence-tabell (bildintelligens) + RLS | Applicerad + verifierad 2026-09-06 |
| `supabase/migrations/0006_gaahlin_site_content.sql` | site_content-tabell + RLS | Applicerad + verifierad 2026-09-06 |
| `src/BookingPage.jsx` | Publik bokningsförfrågan (`/boka`) | Levererad 2026-06-13 (v0.1.0) |
| `src/admin/AdminApp.jsx` | Admin — CMS + Analys (bildintelligens v2, seendet ur lib) + innehåll (**intro-väljaren**) + kunder/leveranser + bokningar + kontakter | v0.16.1 levererad 2026-09-12 (ej pushad); v0.16.0 driftsatt `7f57ae8` |
| `src/client/ClientApp.jsx` | Kund-vy på `/kund` (egna leveranser) + inlogg-härdning | Levererad 2026-09-05 (v0.2.0) |
| `src/lib/supabase.js` | Supabase-klient (`schema: gaahlin`) | Levererad (tidigare session) — **v0.5.0** |
| `src/index.css` | Global stylesheet (publik sida) — hero-inglidning, `.hp-field`, inga filter på fotografierna, loggan i navet, navet står still + isat glas | v0.6.3 levererad 2026-09-12 (ej pushad); v0.6.1 driftsatt `e236e0d` |
| `src/Logo.jsx` | Anders logotyp som inline-SVG-komponent (vektoriserad; viewBox 2861×188; fill currentColor) | v0.1.0 levererad 2026-09-12 (ej pushad) |
| `public/logo/gaahlin-photography.svg` | (trasig: pubg lämnade FILE:-raden kvar — ogiltig XML; används inte längre, kan `git rm`:as) | Driftsatt `e236e0d`, oanvänd |
| `vercel.json` | SPA-rewrite + 308-redirects för gamla URL:er | Levererad 2026-09-06 (v2) |
| `public/robots.txt` | Tillåt publikt, blockera `/admin` + `/kund` | Levererad + deployad 2026-06-13 |
| `public/sitemap.xml` | `/` + `/boka` | Levererad + deployad 2026-06-13 |
| `supabase/functions/invite-client/index.ts` | Edge function — kundinbjudan (service_role) | Deployad + verifierad 2026-06-13 |
| `supabase/migrations/0001_gaahlin_init.sql` | Schema, roller, tabeller, RLS | Applicerad + verifierad 2026-06-10 |
| `supabase/migrations/0002_gaahlin_galleries_storage.sql` | Galleries, images-omstruktur, Storage-bucket | Applicerad + verifierad 2026-06-13 |
| `supabase/migrations/0003_gaahlin_deliveries_storage.sql` | Deliveries-omstruktur, privat bucket + policyer | Applicerad + verifierad 2026-06-13 |
| `supabase/migrations/0004_gaahlin_grant_service_role.sql` | service_role-grant på `gaahlin` | Applicerad + verifierad 2026-06-13 |
| `supabase/migrations/0005_gaahlin_bookings.sql` | `gaahlin.bookings` + RLS | Applicerad + verifierad 2026-06-13 |

---

*Arbetslogg. Uppdatera "Aktuell version", versionshistorik, dokumentlogg och backlog vid varje leverans.*
