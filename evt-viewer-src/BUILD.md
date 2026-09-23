# EVT viewer — sorgente personalizzato per l'edizione Autos

Questo è il sorgente Angular (EVT 3, Angular 13.3.1) da cui viene compilato il
`main.js` alla radice del repository. Base: EVT upstream `evt-project/evt-viewer-angular`
(master, commit `8441f31`) con le personalizzazioni elencate sotto.

## Come compilare

Serve Node 16 (o 20 con il flag OpenSSL legacy). Dalla cartella `evt-viewer-src`:

```bash
npm install --legacy-peer-deps
NODE_OPTIONS=--openssl-legacy-provider npx ng build --configuration production
```

Output in `dist/evt-viewer-angular/`. Per il deploy copiare **solo** `dist/evt-viewer-angular/main.js`
nella radice del repository (gli altri bundle — runtime.js, polyfills.js, scripts.js — sono
invariati rispetto alla build standard; `styles.css` alla radice è già quello buono).

Nota: `src/assets/data` (i dati dell'edizione) NON è incluso qui; i dati reali vivono in
`assets/data/` alla radice del repository.

## Personalizzazioni rispetto a EVT upstream

1. **Marcatore di fase come lettera** (`components/mod/mod.component.*`):
   il quadratino della fase nel changesView mostra la lettera (es. `M`) invece del numero,
   via `getLayerLabel()`.

2. **@change su elementi di blocco** (`components/paragraph/*`, `components/generic-element/*`):
   `<p>`, `<div>`, `<ab>`, `<seg>` con `@change` vengono filtrati per fase nel changesView
   esattamente come i `<mod>` (contenuto visibile solo dalla propria fase in poi), **senza**
   aprire la finestra di apparato. Logica in `layerHidden()`, alimentata da `EVTStatusService.currentChanges$`.

3. **Pipeline pagine personalizzato** (`services/evt-custom-pages.util.ts` +
   `services/evt-model.service.ts`, `panels/text-panel/text-panel.component.ts`,
   `services/evt-status.service.ts`):
   - riordino pagine da `<standOff><transpose><ptr>` (listTranspose);
   - pagine con `<pb type="blank"/>` nascoste nella vista critica (`interpretative`);
   - fallback di navigazione alla pagina più vicina (`__evtFindNearestPage`).
   Queste erano in precedenza iniettate nel bundle compilato; ora sono in sorgente.

4. **Robustezza caricamento** (`services/xml-parsers/structure-xml-parser.service.ts`,
   `services/evt-model.service.ts`): guardie contro sorgenti vuote transitorie.

5. **Adattatore config** (`services/edition-data.service.ts`): supporta il formato
   `editionUrls: [{ type, value, enable }]` usato da `assets/config/file_config.json`,
   oltre al formato stringa.
