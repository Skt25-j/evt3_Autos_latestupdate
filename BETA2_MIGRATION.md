# Migrazione dell'edizione Autos a EVT 3 beta 2 (v2.0.0-beta)

Branch di lavoro: `claude/evt-beta2-migrazione`.
Il branch `claude/adoring-hawking-sv72t5` (EVT 3 vecchio fork) e il sito pubblicato
restano intatti come fallback finché questa migrazione non è completa e verificata.

## Base
`evt-viewer-src/` contiene il sorgente ufficiale **EVT 3 beta 2** (tag `2.0.0-beta`,
repo `evt-project/evt-viewer-angular`), NON più il vecchio fork.
Le immagini dell'edizione (≈590 MB) NON sono committate qui: sono in `assets/data/images/`
(radice del repo) e vanno copiate in `evt-viewer-src/src/assets/data/images/` prima del build.

## Config (fatto)
- `src/assets/config/config.yaml`: puntato su `autos_fix_2.xml`; titolo «Progetto Autos»;
  livelli con le etichette dell'edizione (diplomatic → «diplomatica-interpretativa»,
  interpretative → «critica», critical **disabilitato**, changesView → «changes»);
  default `diplomatic`; logo rimosso.
- **Viste attive** come nell'edizione originale: `imageText, imageImage, imageOnly,
  readingText, documentalMixed` (le altre disabilitate). *Nota:* in `documentalMixed`
  il livello è forzato a `changesView` (è il comportamento EVT); i livelli
  diplomatica/critica si vedono in `readingText`/`imageText`.
- **Colori delle fasi/strati** (`changeSequenceView.layerColors`) portati dall'edizione
  originale + `showVarSeqAttr`/`showSeqAttr: true`, `startingFromDefinitiveLayer: false`.

## Modifiche al software PORTATE e VERIFICATE dal vivo
- **app-parser** `orderChanges`: `sort` per `@varSeq` (box di dettaglio ordinato geneticamente).
- **mod.component** `getLayerLabel`: marcatore di fase come lettera/suffisso (es. «fase-B» → «B»).
- **apparatus-entry-readings**: riga alta ordinata per `@varSeq`, separatore « → » fra varianti,
  sigla « T » (lezione a testo) in fondo. *(reso a video, apparato corretto)*
- `@change` su blocchi `p/div/ab/seg/lg` e su `<note>` (filtro-per-fase) + colore note critiche (blu).
- Lettura di `@change` sul `<pb>` (`structure-xml-parser`) → `Page.writingChange`.
- **Pipeline pagine** (`evt-custom-pages.util.ts`): `<transpose>`, filtro pagine bianche
  (`type="blank"`), fusione porzioni per `@facs`, filtro-per-fase in changesView.
  Override centralizzato in `evt-status.service` (`evtPagesOverride$` → `evt-model.pages$`).
  *(critica: 104 → 82 pagine con trasposizioni + bianche nascoste, verificato)*
- **Guard viewMode** in `currentStatus$` (evita crash "reading 'id' of undefined" nelle viste
  a livello singolo).
- **Fix cambio livello** (URL `el` e click): selettore + text-panel ristrutturati per non
  resettare più il livello al default (vedi commit `beta2: sblocca viste + livelli...`).
- Hook `data-el`/`data-layer` in `index.html`; CSS dell'edizione in `custom-styles.css`.

## Stato: l'edizione FUNZIONA su beta 2
Verificato (headless + screenshot) su `readingText`, `imageText`, `documentalMixed`:
- cambio livello corretto sia da URL (`?el=...`) sia dal menu a tendina;
- testo reso correttamente in tutte le viste; apparato con freccia/varSeq/T;
- changesView con marcatori di fase colorati; nessun warning (colori fasi definiti);
- immagini caricate; niente errori JS in console.

## QA completata (verificata headless + screenshot)
- Trasposizioni di pagina in critica: `Q2_7r → 18v/19v/20v`, `Q2_24r → 16v/17v/Cop_r`,
  `12r/12v/12r_b` correttamente riordinate nel menù pagine (104 → 82 pagine).
- Trasposizioni d'autore (seg): 13r `credetti² ingenuamente¹` → critica «ingenuamente
  credetti»; 22v `curioso² superiore¹` → critica «superiore curioso»; marcatori
  numerici (soloDiplomatica) nascosti in critica. **Fix spazio** fra le due parole
  (::after nei 4 seg, lo spazio in coda al TEI veniva collassato dal rendering).
- soloCritica/soloDiplomatica: in critica il gemello-testo (soloDiplomatica) è nascosto
  e la nota autoriale (soloCritica) appare; in diplomatica/changes il contrario.
  Regola soloCritica resa simmetrica (copre anche `[data-rend~=soloCritica]`).
- changesView: colori delle fasi applicati, marcatori di fase colorati, display
  cumulativo per strato/fase corretto (il marcatore di una fase appare solo dai suoi
  strati in poi); `data-el` impostato anche in documentalMixed.
- imageText/documentalMixed: immagini caricate, testo affiancato, sync attivo.

## Rifinitura opzionale (non bloccante)
- Ghosting/greying "estetico" delle carte future nel page-selector in changesView
  (le pagine ci sono tutte; è un semplice abbellimento visivo, mai implementato).

## Build
`cd evt-viewer-src && npm ci && NODE_OPTIONS=--openssl-legacy-provider npx ng build --configuration production`
(prima copiare le immagini). Angular 13, Node con `--openssl-legacy-provider`.

## Validazione edizione (gate invariato)
`xmllint --noout` + `jing` su `tei-vbd.rng`: baseline 58-59 errori, nessun tipo d'errore nuovo.

## Rifiniture e correzioni QA (ottobre 2026)
Interventi successivi, emersi dalla QA visiva. Per ciascuno il commit.

### Apparato / correzioni (resa di subst/app)
- **`<subst>` con `<del>`/`<add>` multipli** (correzioni in sequenza): EVT beta 2 di serie
  mostrava **un solo del e un solo add** (`data.del`/`data.add`), perdendo gli altri; la
  versione corretta (ciclo su `data.content`) era addirittura presente ma **commentata** nel
  sorgente beta 2. Ripristinato il rendering di **tutti** i figli della subst. *(vera mancanza
  di beta 2)* — `2090e46`, `d4f96f3`.
- **Cancellature barrate (`<del rend="strikethrough">`) nel box del `<mod>/<subst>`** in
  critica: ora compaiono — `37b95cb`.
- **Testo che spariva nelle fasi precedenti in changesView**: l'`<app>` in linea teneva nel
  flusso **solo il `<lem>`** (`items[i] = app.lemma`), spesso di una fase successiva; tenuta
  l'intera voce `<app>` (`items[i] = app`) così la changesView mostra la variante giusta per
  fase, le altre viste restano lemma+apice+box. *(estensione per la vista genetica, non un
  difetto di EVT)* — `f3d1973`.
- **Box d'apparato**: catena genetica ascendente per `@varSeq`, freccia « → » fra le varianti,
  intestazione «lezione a testo]» (la sigla «T» finale è stata poi rimossa a favore della
  lezione finale per esteso); font coerente (Junicode) nei box; niente **doppia freccia**;
  niente spazio vuoto dopo la prima lezione; `<lb/>` nascosti nel box; box su una riga —
  `d8af1cb`, `932d867`, `436e23f`, `0e63dc7`, `c9bb818`, `b3bd1bf`.
- **Al cambio pagina il box non si riapre più da solo** (diplomatica) — `ab4680d`.

### Resa del testo (diplomatica / changes / critica)
- **Parole spezzate a fine riga**: trattino reso `soloDiplomatica` + `<lb>` `soloDiplomatica`
  → in critica le righe spariscono e la parola **si ricompone** (gestiti anche i trattini
  dentro `<hi>`/`<add>`, es. «Sca-pato») — `4e8bfe5`, `0e1c344`.
- **`overwritten`/`superimposed`**: tolto lo spazio spurio (margine 0.3em di del/add) in
  diplomatica/changes — `9580d4c`, `4e8bfe5`.
- **Stanghette nere** da spazi barrati dentro i `<del>`: soppresse — `c9bb818`.
- **Sottolineatura di fase in changes che toccava gli spazi** (trattini staccati): corretta —
  `bfc09a4`.

### Sezione Info
- **Legenda delle fasi/strati**: aggiunta nella scheda Info, con colore (letto da
  `changeSequenceView.layerColors`) **e l'elenco delle pagine** in cui ogni fase/strato
  compare (calcolo a runtime dal documento) — `bc1f940`, `a93fdcd`.
- **Messaggio «no front content» nascosto** quando non c'è contenuto `<front>` testuale —
  `5e8edd2`.

### Bibliografia (dati + stile)
- Autori resi uniformi in forma **«Cognome, Nome»** (solo i `<persName>` dentro `<author>`) —
  `35c1db6` (prima uniformati a «Nome Cognome» in `12b0471`).
- **Titolo sdoppiato** nel box bibliografico: era lo stile *chicago* che stampava sia `title`
  sia `publication` con lo stesso testo; rimosso `publication` da `propsOrder` dello stile —
  `0425bd7`.
- Correzioni dati: titolo «Merope» (era «Maria Stuarda»), `persName` vuoti completati, refusi
  d'autore — `7a5f693`, `12b0471`; reintegro del testo omesso a c. 16v-17r — `797a326`.

### Stabilità
- **Crash di `angular-gridster2`** al cambio modalità di vista: fix permanente via
  `scripts/patch-gridster.js` (postinstall, null-guard sul teardown) — `3b50d56`.

### Note su EVT beta 2 (di serie vs nostre estensioni)
- Il raddoppio del titolo in bibliografia e la perdita dei del/add multipli nelle `<subst>`
  sono **limiti/scelte di EVT beta 2**, non errori di codifica dell'edizione.
- La freccia « → » nel box è **nostra aggiunta** (nel beta 2 di serie non c'è: solo «lemma]»).
- `items[i] = app` è un'**estensione** per la changesView; il comportamento di serie
  (solo lemma nel flusso) è corretto per le edizioni critiche classiche (es. campioni Saba/Lucullus).
