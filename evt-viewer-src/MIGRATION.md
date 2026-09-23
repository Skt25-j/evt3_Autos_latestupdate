# Checklist di migrazione verso una nuova versione di EVT (es. beta EVT3)

Quando esce una nuova base EVT, il `main.js` non si travasa: va **riportato** l'elenco
di modifiche qui sotto sul sorgente nuovo e ricompilato. Procedura:

1. Ottieni il sorgente della beta (clone del repo EVT alla versione/branch giusti).
2. `npm install --legacy-peer-deps` (se resta Angular 13; se la beta usa Angular più
   nuovo servirà Node coerente — vedi `BUILD.md`).
3. Per **ogni voce** sotto: controlla se è **già presente** nella beta (i bug fix
   spesso lo sono). Se sì → salta. Se no → riporta la modifica.
4. Compila: `NODE_OPTIONS=--openssl-legacy-provider npx ng build --configuration production`.
5. Esegui le **verifiche** in fondo. Deploya solo `dist/.../main.js` (vedi `BUILD.md`).

Legenda tipo: **[BUG]** correzione di un difetto EVT (probabilmente già risolta nella beta) ·
**[FEAT]** funzionalità custom (da riportare quasi sicuramente) ·
**[ADATT]** adattatore all'edizione (potrebbe non servire se la beta cambia schema).

---

## Elenco modifiche

### 1. [FEAT] Filtro-per-fase su blocchi `p/div/ab/seg`
- File: `components/paragraph/paragraph.component.{ts,html}`, `components/generic-element/generic-element.component.{ts,html}`
- Cosa: in `changesView`, un elemento con `@change` si mostra solo dalla sua fase in poi
  (come i `<mod>`), senza aprire l'apparato. La fase corrente arriva dall'`@Input selLayer`
  (NON `selectedLayer`: è il nome che il content-viewer passa davvero); l'ordine fasi da
  `EVTStatusService.currentChanges$`; logica in `layerHidden()`.
- Verifica beta: guarda come il content-viewer nomina l'input della fase (cerca `selLayer`)
  e se paragraph/generic-element lo leggono. Se il nome è cambiato, adegua.

### 2. [BUG] `buildChangeList`: ordine fasi vuoto con un solo `<listChange>`
- File: `services/xml-parsers/mod-parser.service.ts`
- Cosa: il ciclo era `i < parsedList.length-1` → con un solo `<listChange>` non popolava
  `layerOrder` (nessun filtro fase, né mod né blocchi). Corretto in `i < parsedList.length`.
- Verifica beta: se con un solo `<listChange ordered="true">` il selettore fasi mostra le
  fasi, è già a posto.

### 3. [BUG] `<lb/>` senza a-capo in `changesView`
- File: `components/lb/lb.component.ts`
- Cosa: lo `switch(editionLevel)` non aveva il caso `changesView` (ritornava `undefined`
  → niente `<br>`). Aggiunto `case 'changesView'` (come diplomatic/interpretative) + `default`.
- Verifica beta: in changesView gli a-capo si vedono? Se sì, già a posto.

### 4. [BUG] `parsePages` crash su sorgente vuoto transitorio
- File: `services/xml-parsers/structure-xml-parser.service.ts`
- Cosa: `el.firstElementChild.ownerDocument` esplodeva se `el` non ha figli. Aggiunto
  guard `if (!el || !el.firstElementChild) return { pages: [] }`.

### 5. [BUG/robustezza] Filtro emissioni vuote di `rawPages$`
- File: `services/evt-model.service.ts`
- Cosa: `rawPages$` filtra `pages.length > 0` per non propagare stati vuoti transitori
  (che facevano terminare lo stream RxJS e lasciavano l'app bianca).

### 6. [ADATT] `editionUrls` a oggetti `{type,value,enable}`
- File: `services/edition-data.service.ts`
- Cosa: supporta sia `editionUrls: ["url"]` sia `editionUrls: [{value:"url",...}]`.
- Verifica beta: se la beta è il refactor "data-model", probabilmente gestisce già il
  formato a oggetti → questo adattatore potrebbe essere inutile.

### 7. [FEAT] Pipeline pagine custom: transpose + pagine bianche + fallback
- File: `services/evt-custom-pages.util.ts` (nuovo) + agganci in:
  - `services/evt-model.service.ts`: `rawPages$` (originali) e `pages$ = combineLatest([rawPages$, evtPagesOverride$])`.
  - `panels/text-panel/text-panel.component.ts`: in `currentStatus$` (vista critica =
    `interpretative`) calcola l'override = transpose + filtro pagine bianche, e lo pubblica in `evtPagesOverride$`.
  - `services/evt-status.service.ts`: `currentPage$` usa `evtFindNearestPage` come fallback.
- Funzioni: `evtApplyTranspositions` (riordino **pagine** se `<ptr>`→`<pb>`, **relocazione
  blocchi** ricorsiva/immutabile se `<ptr>`→blocco con xml:id, anche cross-page),
  `evtFilterBlankPages` (nasconde `<pb type="blank"/>` in critica), `evtFindNearestPage`,
  `evtGetOwnerDoc`, `evtPagesOverride$`.
- Nota: applicato solo in vista critica; la diplomatica resta con ordine originale.

### 8. [FEAT] Marcatore di fase come lettera
- File: `components/mod/mod.component.{ts,html}`
- Cosa: `getLayerLabel()` mostra la lettera della fase (es. `M`) invece dell'indice numerico.

### 9. [Edizione, non-EVT] Hook e CSS
- `index.html`: script che rispecchia la vista (`el`) su `<html data-el>` per il CSS.
- `assets/config/custom-styles.css`: colore dei blocchi `[data-change]` per fase in changesView,
  visibilità note `soloCritica`/`soloDiplomatica`.
- Questi vivono nell'edizione, non nel sorgente EVT: si riusano tali e quali.

---

## Verifiche (da rieseguire dopo il port)

In `changesView`:
- **Filtro fase**: seleziona una fase precedente a quella di un blocco `@change` → il blocco
  sparisce; dalla sua fase in poi → riappare. Clic sul blocco → nessun pannello d'apparato.
- **A-capo**: gli `<lb/>` producono l'a-capo.

In vista **critica** (`interpretative`):
- **Pagine bianche**: le pagine `<pb type="blank"/>` non compaiono.
- **Transpose pagine**: l'ordine pagine segue i `<transpose>` con `<ptr>`→`<pb>`.
- **Transpose blocchi**: un blocco con `xml:id` puntato da `<ptr>` viene rilocato subito
  dopo l'elemento precedente del transpose, anche su un'altra pagina; in **diplomatica**
  l'ordine resta originale.

Sanity generale: l'app carica l'edizione, 0 errori in console, le liste/note funzionano.
