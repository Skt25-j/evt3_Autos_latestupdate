/*
 * [Autos] Patch per angular-gridster2 (v13.3.x).
 *
 * La libreria, durante la distruzione dei pannelli (es. quando si cambia
 * modalita' di vista, p.es. da "Documental" a "Reading Text"), accede a
 * riferimenti gia' azzerati e lancia errori come:
 *   - "Cannot read properties of undefined (reading 'unsubscribe')"
 *   - "Cannot read properties of undefined (reading 'itemRemovedCallback')"
 * Questi errori interrompono la pulizia della vista e possono lasciare il
 * pannello dell'apparato in uno stato rotto.
 *
 * Non potendo modificare il sorgente della libreria in modo stabile, questo
 * script rende "null-safe" i punti di teardown aggiungendo l'optional chaining
 * (?.). Viene eseguito automaticamente dopo ogni `npm install` (hook postinstall)
 * ed e' idempotente: se le patch sono gia' applicate non cambia nulla.
 *
 * Se angular-gridster2 non e' presente o cambia molto in una versione futura,
 * lo script non blocca l'installazione: segnala soltanto cosa non ha trovato.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PKG_DIR = path.join(__dirname, '..', 'node_modules', 'angular-gridster2');

// Sostituzioni mirate e sicure (idempotenti: il pattern col solo "." non
// combacia piu' una volta diventato "?.").
const REPLACEMENTS = [
  ['this.sub.unsubscribe()', 'this.sub?.unsubscribe()'],
  ['this.options.itemRemovedCallback', 'this.options?.itemRemovedCallback'],
  ['this.gridster.removeItem(this)', 'this.gridster?.removeItem(this)'],
  ['this.drag.destroy()', 'this.drag?.destroy()'],
  ['this.resize.destroy()', 'this.resize?.destroy()'],
  ['this.calculateLayout$.next()', 'this.calculateLayout$?.next()'],
  ['this.grid.splice(this.grid.indexOf(itemComponent), 1)',
    'this.grid?.splice(this.grid.indexOf(itemComponent), 1)'],
];

function collectMjs(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      collectMjs(full, acc);
    } else if (e.isFile() && e.name.endsWith('.mjs')) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  if (!fs.existsSync(PKG_DIR)) {
    console.warn('[patch-gridster] angular-gridster2 non trovato: salto (nessuna patch necessaria).');
    return;
  }

  const files = collectMjs(PKG_DIR, []);
  let filesChanged = 0;
  let totalEdits = 0;

  for (const file of files) {
    let src = fs.readFileSync(file, 'utf8');
    let edits = 0;
    for (const [from, to] of REPLACEMENTS) {
      const parts = src.split(from);
      if (parts.length > 1) {
        edits += parts.length - 1;
        src = parts.join(to);
      }
    }
    if (edits > 0) {
      fs.writeFileSync(file, src);
      filesChanged++;
      totalEdits += edits;
    }
  }

  if (totalEdits > 0) {
    console.log(`[patch-gridster] applicate ${totalEdits} patch su ${filesChanged} file.`);
  } else {
    console.log('[patch-gridster] gia\' applicate (o niente da modificare).');
  }
}

try {
  main();
} catch (e) {
  // Non far fallire l'installazione per questo.
  console.warn('[patch-gridster] avviso: patch non applicata (' + e.message + ').');
}
