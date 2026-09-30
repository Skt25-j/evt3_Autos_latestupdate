# Migrazione dell'edizione Autos a EVT 3 beta 2 (v2.0.0-beta)

Branch di lavoro: `claude/evt-beta2-migrazione`.
Il branch `claude/adoring-hawking-sv72t5` (EVT 3 vecchio fork) e il sito pubblicato
restano intatti come fallback finché questa migrazione non è completa e verificata.

## Base
`evt-viewer-src/` contiene ora il sorgente ufficiale **EVT 3 beta 2** (tag `2.0.0-beta`,
repo `evt-project/evt-viewer-angular`, branch `master`), NON più il vecchio fork.
Le immagini dell'edizione (≈590 MB) NON sono committate qui: sono già in `assets/data/images/`
(radice del repo) e vanno copiate in `evt-viewer-src/src/assets/data/images/` prima del build.

## Config (fatto)
- `src/assets/config/config.yaml`: puntato su `assets/data/autos_fix_2.xml`; titolo
  «Progetto Autos»; livelli con le etichette dell'edizione (diplomatic → «diplomatica-interpretativa»,
  interpretative → «critica», critical **disabilitato**, changesView → «changes»); default `diplomatic`;
  logo rimosso.
- `src/assets/data/autos_fix_2.xml` + `src/assets/data/schema/tei-vbd.rng` copiati.

## Modifiche al software già PORTATE (verificate assenti nel sorgente beta 2)
- **app-parser** `orderChanges`: `sort` per `@varSeq` (box di dettaglio ordinato geneticamente).
- **mod.component** `getLayerLabel`: marcatore di fase come lettera/suffisso (es. «fase-B» → «B»).
  *(verificato dal vivo: i marcatori mostrano C/M/B)*
- **apparatus-entry-readings**: riga alta ordinata per `@varSeq`, separatore « → » fra varianti,
  sigla « T » (lezione a testo) in fondo. *(compilato nel bundle; QA visiva finale da fare)*

## Modifiche ANCORA DA PORTARE
- `@change` su blocchi `p/div/ab/seg/lg` (filtro-per-fase) + formattazione inline condizionata
  (classe `evt-change-pending`). In beta 2 usare `selectedLayer` (già plumbed) + `currentChanges$`.
- `@change` sulle `<note>` (filtro-fase) + colore note critiche (blu). Nota spostata in
  `components/notes/note/`.
- Lettura di `@change` sul `<pb>` nel parser (`structure-xml-parser`) → `Page.writingChange`.
- **Pipeline pagine** (`evt-custom-pages.util.ts`, nuovo file): applicazione di `<transpose>`,
  filtro pagine bianche (`type="blank"`), fusione porzioni per `@facs`, filtro pagine per fase
  in changesView, sync immagine↔testo dopo riordino. Da ri-cablare in `text-panel`, `evt-model.service`,
  `page-selector`, viste immagine.

## Build
`cd evt-viewer-src && npm ci && NODE_OPTIONS=--openssl-legacy-provider npx ng build --configuration production`
(prima copiare le immagini, vedi sopra). Angular 13, Node con `--openssl-legacy-provider`.

## Validazione edizione (gate invariato)
`xmllint --noout` + `jing` su `tei-vbd.rng`: baseline 58-59 errori, nessun tipo d'errore nuovo.
