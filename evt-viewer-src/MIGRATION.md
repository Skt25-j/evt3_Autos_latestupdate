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

### 1. [FEAT] Filtro-per-fase su blocchi `p/div/ab/seg/lg` + formattazione inline condizionata
- File: `components/paragraph/paragraph.component.{ts,html}`, `components/generic-element/generic-element.component.{ts,html}`, `assets/config/custom-styles.css`
- Cosa (blocchi): in `changesView`, un **blocco** con `@change` (`p` = paragraph; `div/ab/seg`
  = generic-element, whitelist `FILTERABLE_BLOCKS`) si mostra solo dalla sua fase in poi
  (come i `<mod>`), senza aprire l'apparato. Fase corrente dall'`@Input selLayer` (NON
  `selectedLayer`: è il nome che il content-viewer passa davvero); ordine fasi da
  `EVTStatusService.currentChanges$`; logica in `layerHidden()`.
- Cosa (inline): un elemento **inline** con `@change` (tipico `<hi rend="underline" change>`)
  NON viene nascosto (il testo era scritto prima); ma la sua **formattazione** compare solo
  dalla fase del change in poi. GenericElement aggiunge la classe host `evt-change-pending`
  (getter `changePending`) finché la fase selezionata precede quella del change, e il CSS in
  `custom-styles.css` (`html[data-el="changesView"] evt-generic-element.evt-change-pending`)
  azzera sottolineatura/grassetto/corsivo/sfondo.
- Verifica beta: come il content-viewer nomina l'input della fase (cerca `selLayer`) e se
  paragraph/generic-element lo leggono. Se il nome è cambiato, adegua.

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
- Funzioni: `evtApplyTranspositions` (riordino **pagine** se `<ptr>`→`<pb>` **oppure**
  `<ptr>`→elemento che *avvolge* un `<pb>`, tipicamente `<div type="page" xml:id="...">`;
  **relocazione blocchi** ricorsiva/immutabile se `<ptr>`→blocco di contenuto con xml:id,
  anche cross-page), `evtFilterBlankPages` (nasconde `<pb type="blank"/>` in critica),
  `evtFindNearestPage`, `evtGetOwnerDoc`, `evtPagesOverride$`.
- `<ptr>`→`<div>`-pagina: motivazione editoriale = il `<pb>` è dato **diplomatico**, la
  trasposizione è fatto **critico**, quindi il `<ptr>` punta al `<div type="page">` (unità
  critica) e non al `<pb>`. Risoluzione basata sull'identità degli oggetti `Page` (robusta
  anche con più `<transpose>` a catena); il `<pb>` può restare senza `xml:id` (l'id pagina
  viene comunque generato da `getID`). Retro-compatibile con `<ptr>`→`<pb>`.
- Nota: applicato solo in vista critica; la diplomatica resta con ordine originale.

### 8. [FEAT] Marcatore di fase come lettera
- File: `components/mod/mod.component.{ts,html}`
- Cosa: `getLayerLabel()` mostra la lettera della fase (es. `M`) invece dell'indice numerico.

### 9. [Edizione, non-EVT] Hook e CSS
- `index.html`: script che rispecchia la vista (`el`) su `<html data-el>` per il CSS.
- `assets/config/custom-styles.css`: colore dei blocchi `[data-change]` per fase in changesView,
  visibilità note `soloCritica`/`soloDiplomatica`.
- Questi vivono nell'edizione, non nel sorgente EVT: si riusano tali e quali.

### 10. [BUG] Sincronizzazione immagine↔testo con pagine riordinate
- File: `view-modes/image-text/image-text.component.ts`,
  `view-modes/image-image/image-image.component.ts`,
  `view-modes/documental-mixed/documental-mixed.component.ts`,
  `panels/image-panel/image-panel.component.ts`
- Sintomo: con la trasposizione delle pagine (override su `pages$`) il testo si
  riordina ma le **immagini no** → da un certo punto foto e testo non corrispondono più.
- Causa: `imageViewer$` era `surfaces$.pipe(withLatestFrom(pages$), …)`: emette solo
  quando emette `surfaces$` (una volta), fotografando `pages$` nell'ordine ORIGINALE e
  non reagendo più al riordino. L'OSD costruisce le tiles da lì, ma sceglie la tile per
  **indice** su `pages$` riordinato → disallineamento.
- Fix: `imageViewer$ = combineLatest([surfaces$, pages$]).pipe(map(...))` (reattivo al
  riordino) in tutte le viste con immagini; e `pageNumber$` dell'`image-panel` da
  `currentPageId$.pipe(withLatestFrom(pages$))` a `combineLatest([currentPageId$, pages$])`
  così l'indice si ricalcola al riordino, non solo alla navigazione.
- Verifica beta: se la beta gestisce già il riordino pagine con immagini allineate, salta.
  Riguarda qualunque riordino di pagine (anche `ptr`→`pb`), non solo `ptr`→`div`.

### 11. [FEAT] Filtro pagine per fase in changesView (Task 2)
- File: `panels/text-panel/text-panel.component.ts`, `services/evt-custom-pages.util.ts`,
  `services/xml-parsers/structure-xml-parser.service.ts`, `models/evt-models.ts`
  + dati: `@change="#fase-X"`/`"#strato-Y"` sui `<pb>` in `assets/data/text/autos_fix_2.xml`.
- Cosa: **solo nella vista "changes" (changesView)**, comportamento ibrido cumulativo
  (per indice in `layerOrder`, valido per fasi e strati; carta senza `@change` = sempre
  presente):
  - **navigazione** (slider di pagina, frecce, miniature, testo renderizzato): le carte
    scritte dopo il livello selezionato **non compaiono** — filtro su `pages$` (globale);
  - **selettore a tendina**: mostra **tutte** le carte da `rawPages$`, **ingrigendo e
    disabilitando** (ghosting) quelle future — colpo d'occhio completo ma non selezionabili.
  In diplomatica e critica NON si applica (tendina = `pages$`, nessun ghosting).
- Perche' l'ibrido: la nav-bar ha uno `ngx-slider` continuo per indice, non "ingrigibile"
  a tratti → per la navigazione l'unico modo coerente e' ridurre `pages$`; la tendina
  invece puo' mostrare tutto col ghosting (ng-select disabilita gli item `disabled:true`).
- Come: il parser legge `pb.getAttribute('change')` in `Page.writingChange`; in
  `text-panel.currentStatus$` (che gia' pubblica `evtPagesOverride$`) si aggiunge, per
  `editionLevelID === 'changesView'`, `evtFilterByWritingPhase(pages, selectedLayer,
  layerOrder)` (da `evt-custom-pages.util.ts`); currentStatus$ dipende anche da
  `evtStatus.updateLayer$` e `evtModelService.changeData$`. Il `page-selector` costruisce
  `displayPages$` da `rawPages$` + `currentEditionLevels$` marcando `disabled` per le
  carte future (solo in changesView).
- Dati: la fase/strato di scrittura è sul `<pb>` come `@change`; una carta a cavallo di
  due livelli va marcata col PRIMO. Alcune carte di margine (bianche, `27r1`, copertine q2)
  sono lasciate senza `@change` = sempre presenti.
- Verifica beta: se cambia la pipeline pagine o i nomi `updateLayer$`/`changeData$.layerOrder`,
  adeguare; il filtro vive nell'override di `text-panel`, non nel `page-selector`.

### 12. [FEAT] Pagine "spezzate" in porzioni: unitarie in diplomatica/changes, dislocate in critica
- File: `services/evt-custom-pages.util.ts` (`evtMergePagesByFacs`),
  `panels/text-panel/text-panel.component.ts`, `components/page-selector/page-selector.component.ts`.
- Contesto encoding: alcune pagine fisiche sono codificate come PIU' `<div type="page">`
  consecutivi (porzioni), ognuno col suo `<pb>` che punta alla STESSA immagine `@facs`
  (es. 7r2 = 3 porzioni facs=7r2.jpg; 3v2, 4v2, 15r2 ecc.). Le trasposizioni puntano
  alle singole porzioni (div), che in critica vengono dislocate secondo l'ordine critico.
- Problema: in diplomatica/changes quelle porzioni comparivano come pagine separate
  (pagina non unitaria, ripetuta).
- Soluzione: `evtMergePagesByFacs(pages, layerOrder?)` fonde porzioni CONSECUTIVE con lo
  stesso `@facs` reale (le bianche senza immagine non si fondono) concatenandone il
  contenuto in ordine documentario; la pagina fusa eredita id/label/facs della prima e
  `writingChange` = fase piu' antica. Applicata in `text-panel.currentStatus$` per
  **diplomatic** (solo merge) e **changesView** (filtro-fase POI merge), e nel
  **page-selector** (tendina) per changesView. In **interpretative (critica)** NON si
  fonde: le porzioni restano separate per essere dislocate dalle trasposizioni.
- Risultato: diplomatica/changes mostrano la pagina unitaria una sola volta (ordine
  diplomatico); critica mostra le porzioni dislocate (anche tra pagine).
- Verifica beta: se cambia la pipeline pagine, riportare merge/filtro/transpose negli
  override per livello d'edizione.

### 13. [BUG] Box dell'apparato: letture non ordinate per @varSeq
- File: `services/xml-parsers/app-parser.ts` (`orderChanges`).
- Sintomo: nel box che si apre cliccando un `<app>` (mod-group), le letture di uno
  stesso apparato comparivano nell'ordine del documento invece che per `@varSeq`
  (evidente con piu' letture nella stessa fase). L'elenco inline era gia' corretto
  (usa `orderedReadings`, ordinato per varSeq); il box invece usa `changes`.
- Fix: `orderChanges` ora ordina i `changes` (i `<mod>` delle letture) per `@varSeq`
  (il mod eredita il varSeq del genitore lem/rdg). Cosi' il box mostra la sequenza
  genetica 1,2,3...

### 14. [FEAT] Riga alta del box apparato: varianti per @varSeq + separatore
- File: `components/apparatus-entry/apparatus-entry-readings/apparatus-entry-readings.component.{ts,html}`.
- Cosa: nella riga "lemma] varianti" del box d'apparato, le varianti sono ora ordinate
  per `@varSeq` crescente (sequenza genetica: dalla piu' antica alla piu' recente) e
  separate da una freccia " -> " (es. "sollecito] ratto -> presto"), come nelle edizioni
  critiche. Prima erano in ordine di documento.

### 15. [BUG] `mod-sequence`: `@varSeq` ripetuto all'infinito con `showVarSeqAttr: true`
- File: `components/mod/mod-sequence/mod-sequence.component.html`.
- Config: `assets/config/edition_config_Autos.json` → `changeSequenceView.showVarSeqAttr`
  e `showSeqAttr` portati a `true`.
- Sintomo: attivando `showVarSeqAttr` il box mostrava il numero di `@varSeq` ripetuto
  una volta per ogni layer (es. "1 2 1 2 1 2 ..." all'infinito, tanti giri quanti i 15
  layer del `<listChange>`).
- Causa: lo `<span class="mod-varSeq">` era dentro il doppio `*ngFor`
  (`orderedLayer` × `mod`) ma **fuori** dal `*ngIf` che filtra il mod sul layer corrente
  (`mod.changeLayer === orderedLayer`), quindi veniva stampato ad ogni iterazione di layer,
  anche quando il mod non apparteneva a quel layer. C'era inoltre un `<ng-container>`
  (tag di apertura invece di chiusura) che sbilanciava il template.
- Fix: spostato lo `<span class="mod-varSeq" *ngIf="showVarSeqAttr && mod?.varSeq">` dentro
  il blocco `*ngIf` del match layer, e corretto il tag di chiusura. Ora ogni `@varSeq`
  compare una sola volta accanto al proprio mod.
- Verifica: in `changesView`, apri il box di un app con più `<mod varSeq>` (es. 10r1,
  "come/comead/adil posto di"): mostra `1 fase-A: come`, `2 fase-A: comead`,
  `3 fase-A: adil posto di` (ogni numero una sola volta, ordine per `@varSeq`).

---

## Verifiche (da rieseguire dopo il port)

In `changesView`:
- **Filtro fase**: seleziona una fase precedente a quella di un blocco `@change` → il blocco
  sparisce; dalla sua fase in poi → riappare. Clic sul blocco → nessun pannello d'apparato.
- **A-capo**: gli `<lb/>` producono l'a-capo.

In vista **critica** (`interpretative`):
- **Pagine bianche**: le pagine `<pb type="blank"/>` non compaiono.
- **Transpose pagine**: l'ordine pagine segue i `<transpose>` con `<ptr>`→`<pb>`
  **oppure** `<ptr>`→`<div type="page">` (id sul div, unità critica).
- **Immagine↔testo**: selezionando una pagina trasposta, l'immagine mostrata è quella
  della pagina (es. testo `18v1` → foto `18v.jpg`), sia in imageText che image-image.
- **Transpose blocchi**: un blocco con `xml:id` puntato da `<ptr>` viene rilocato subito
  dopo l'elemento precedente del transpose, anche su un'altra pagina; in **diplomatica**
  l'ordine resta originale.

Sanity generale: l'app carica l'edizione, 0 errori in console, le liste/note funzionano.
