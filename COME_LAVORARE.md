# Promemoria — come lavorare all'edizione Autos

Guida pratica per modificare l'edizione, vederla e pubblicarla.
Vale per il Mac, in VS Code.

---

## 1. Dove modificare (IMPORTANTE)

Modifica **solo** i file dentro la cartella `evt-viewer-src/`.

Il file dell'edizione (il TEI/XML) è **uno solo**:

```
evt-viewer-src/src/assets/data/autos_fix_2.xml
```

> ⚠️ Non esiste più nessuna "copia nella radice": c'è un unico file, questo.
> Niente più rischio di modificare il file sbagliato.

---

## 2. Vedere le modifiche MENTRE lavori (anteprima locale)

Non si usa più "Go Live". Si usa il server di EVT (`ng serve`):

1. Apri il terminale in VS Code e scrivi (una volta a inizio sessione):
   ```
   cd evt-viewer-src
   npx ng serve
   ```
2. Apri nel browser: `http://localhost:4200`
3. Da qui in poi: **modifichi l'XML, salvi, e la pagina si aggiorna da sola.**
   Niente altri comandi.
4. Quando hai finito, ferma il server con `Ctrl + C` nel terminale.

### Funziona anche SENZA internet?
Sì, con un'unica eccezione fatta **una volta sola**:
- le librerie di EVT stanno nella cartella `evt-viewer-src/node_modules`.
- Quella va scaricata **una volta, con internet**:
  ```
  cd evt-viewer-src
  npm install
  ```
- Dopo che `node_modules` esiste, `ng serve` funziona **offline** per sempre.

Riassunto:
| Cosa | Serve internet? |
|---|---|
| Anteprima locale con `ng serve` (se `node_modules` c'è già) | NO |
| Primissima `npm install` delle librerie | SÌ (una volta sola) |

---

## 3. Pubblicare le modifiche (farle vedere ai referee)

Quando una modifica è pronta e la vuoi online:

```
git add -A
git commit -m "descrizione breve della modifica"
git pull origin main        # allinea, se hai lavorato su più computer
git push origin main
```

A ogni `push` su `main`, **GitHub ricostruisce il sito da solo** e lo pubblica.
Ci vogliono ~2-3 minuti. Lo stato lo vedi qui (deve diventare verde):

- https://github.com/Skt25-j/evt3_Autos_latestupdate/actions

### Dove si vede l'edizione online
- https://skt25-j.github.io/evt3_Autos_latestupdate/

> Apri sempre con **refresh forzato** (`Cmd + Shift + R`), altrimenti il browser
> ti rimostra la versione vecchia tenuta in memoria (cache).

---

## 4. Se hai lavorato su un altro computer / di là

Prima di iniziare, allineati sempre:

```
git pull origin main
```

---

## In breve

- **Modifico** → solo in `evt-viewer-src/` (XML: `src/assets/data/autos_fix_2.xml`)
- **Vedo in locale** → `cd evt-viewer-src` + `npx ng serve` → `http://localhost:4200`
- **Pubblico** → `git add -A` → `git commit -m "..."` → `git pull origin main` → `git push origin main`
- **Vedo online** → https://skt25-j.github.io/evt3_Autos_latestupdate/ (refresh forzato)
