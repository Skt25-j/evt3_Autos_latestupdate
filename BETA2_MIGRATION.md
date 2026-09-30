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

## QA ancora da completare (rifinitura)
- Verifica visiva puntuale delle due trasposizioni d'autore in critica (13r, 22v) e
  del riordino carte nel menù pagine.
- soloCritica/soloDiplomatica (CSS `html[data-el]`) su casi reali.
- Ghosting/greying delle carte future nel page-selector in changesView.
- Sync immagine↔testo dopo il riordino in imageText.
- QA visiva completa multi-pagina prima della presentazione al referee.

## Build
`cd evt-viewer-src && npm ci && NODE_OPTIONS=--openssl-legacy-provider npx ng build --configuration production`
(prima copiare le immagini). Angular 13, Node con `--openssl-legacy-provider`.

## Validazione edizione (gate invariato)
`xmllint --noout` + `jing` su `tei-vbd.rng`: baseline 58-59 errori, nessun tipo d'errore nuovo.
