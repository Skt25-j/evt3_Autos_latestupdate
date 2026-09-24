import { Component, Input, Output } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';

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

  // Selettore con "ghosting" per fase: una carta con @change="#fase-X" (letto sul
  // <pb> in writingChange) resta disabilitata finche' la fase selezionata non
  // raggiunge X (cumulativo). Il filtro agisce SOLO quando e' selezionata una
  // fase; con uno strato (strato-*) non si disabilita nulla.
  public displayPages$ = combineLatest([
    this.pages$,
    this.evtStatus.updateLayer$.pipe(startWith(undefined as string)),
    this.evtStatus.currentChanges$.pipe(startWith(undefined)),
  ]).pipe(
    map(([pages, selectedLayer, changes]) => {
      const layerOrder: string[] = (changes && changes.layerOrder) || [];
      const clean = (l: string) => (l || '').replace('#', '');
      const isFase = (l: string) => clean(l).startsWith('fase-');
      const idxOf = (l: string) => layerOrder.indexOf(clean(l));

      const selIsFase = isFase(selectedLayer);
      const selIdx = idxOf(selectedLayer);

      return pages.map((p, i) => {
        let disabled = false;
        // disabilita solo se: e' selezionata una fase, la carta ha una fase di
        // scrittura (fase-*), e quella fase viene DOPO la fase selezionata.
        if (selIsFase && selIdx !== -1 && p.writingChange && isFase(p.writingChange)) {
          const pIdx = idxOf(p.writingChange);
          disabled = pIdx !== -1 && pIdx > selIdx;
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
