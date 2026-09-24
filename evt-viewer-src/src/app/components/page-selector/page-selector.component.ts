import { Component, Input, Output } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';

import { EditionLevelType } from '../../app.config';
import { Page } from '../../models/evt-models';
import { EVTModelService } from '../../services/evt-model.service';
import { EVTStatusService } from '../../services/evt-status.service';

// Copia di Page arricchita per la vista del selettore:
// - num: numero progressivo mostrato accanto all'etichetta
// - disabled: "ghosting" per fase (ng-select disabilita e ingrigisce le carte
//   non ancora scritte nella fase selezionata)
interface PageOption extends Page {
  num: number;
  disabled: boolean;
}

@Component({
  selector: 'evt-page-selector',
  templateUrl: './page-selector.component.html',
  styleUrls: ['./page-selector.component.scss'],
})
export class PageSelectorComponent {
  public pages$ = this.evtModelService.pages$;

  // Selettore con "ghosting" cumulativo per fase/strato: una carta con
  // @change="#fase-X" o "#strato-Y" (letto sul <pb> in writingChange) resta
  // disabilitata finche' il livello selezionato non raggiunge quel livello
  // nell'ordine cronologico (layerOrder). Criterio cumulativo puro sull'indice:
  // disponibile se indice(selezionato) >= indice(scrittura della carta). Vale sia
  // per le fasi sia per gli strati (es. 7v2 solo da strato-E, 20v2 da strato-L).
  // Le carte senza @change sono sempre disponibili.
  public displayPages$ = combineLatest([
    this.pages$,
    this.evtStatus.updateLayer$.pipe(startWith(undefined as string)),
    this.evtStatus.currentChanges$.pipe(startWith(undefined)),
    this.evtStatus.currentEditionLevels$.pipe(startWith([] as EditionLevelType[])),
  ]).pipe(
    map(([pages, selectedLayer, changes, editionLevels]) => {
      const layerOrder: string[] = (changes && changes.layerOrder) || [];
      const clean = (l: string) => (l || '').replace('#', '');
      const idxOf = (l: string) => layerOrder.indexOf(clean(l));

      // Il ghosting per fase/strato agisce SOLO nella vista "changes"
      // (changesView): in diplomatica e in critica il selettore mostra tutte le
      // carte, sempre disponibili.
      const inChanges = (editionLevels && editionLevels[0]) === 'changesView';
      const selIdx = idxOf(selectedLayer);

      return pages.map((p, i) => {
        let disabled = false;
        if (inChanges && selIdx !== -1 && p.writingChange) {
          const pIdx = idxOf(p.writingChange);
          disabled = pIdx !== -1 && pIdx > selIdx; // carta scritta DOPO il livello selezionato
        }

        return { ...p, num: i + 1, disabled } as PageOption;
      });
    }),
  );

  // tslint:disable-next-line: variable-name
  private _pageID: string;
  @Input() set pageID(p: string) {
    this._pageID = p;
    this.selectedPage$.next(this._pageID);
  }
  get pageID() { return this._pageID; }

  selectedPage$ = new BehaviorSubject<string>(undefined);

  @Output() selectionChange = combineLatest([
    this.pages$,
    this.selectedPage$.pipe(distinctUntilChanged()),
  ]).pipe(
    filter(([pages, pageID]) => !!pageID && !!pages && pages.length > 0),
    map(([pages, pageID]) => pages.find((p) => p.id === pageID)),
  );

  constructor(
    private evtModelService: EVTModelService,
    private evtStatus: EVTStatusService,
  ) {
  }

}
