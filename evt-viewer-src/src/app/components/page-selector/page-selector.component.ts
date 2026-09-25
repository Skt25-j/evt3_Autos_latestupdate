import { Component, Input, Output } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';

import { EditionLevelType } from '../../app.config';
import { Page } from '../../models/evt-models';
import { EVTModelService } from '../../services/evt-model.service';
import { EVTStatusService } from '../../services/evt-status.service';

// Copia di Page per la vista del selettore: num = numero progressivo (posizione
// nel documento), disabled = "ghosting" (ingrigita e non cliccabile).
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

  // In changesView la tendina mostra TUTTE le carte (da rawPages$), ingrigendo e
  // disabilitando (ghosting) quelle scritte DOPO il livello selezionato: cosi' si
  // vede il colpo d'occhio completo ma non si possono selezionare. La navigazione
  // (slider/frecce/testo) resta invece limitata a pages$, gia' filtrato a monte.
  // In diplomatica/critica la tendina usa pages$ com'e', senza ghosting.
  public displayPages$ = combineLatest([
    this.evtModelService.rawPages$,
    this.pages$,
    this.evtStatus.updateLayer$.pipe(startWith(undefined as string)),
    this.evtModelService.changeData$.pipe(startWith(undefined)),
    this.evtStatus.currentEditionLevels$.pipe(startWith([] as EditionLevelType[])),
  ]).pipe(
    map(([rawPages, pages, selectedLayer, changeData, editionLevels]) => {
      const inChanges = (editionLevels && editionLevels[0]) === 'changesView';
      if (!inChanges) {
        return pages.map((p, i) => ({ ...p, num: i + 1, disabled: false } as PageOption));
      }
      const layerOrder: string[] = (changeData && (changeData as any).layerOrder) || [];
      const clean = (l: string) => (l || '').replace('#', '');
      const idxOf = (l: string) => layerOrder.indexOf(clean(l));
      const selIdx = idxOf(selectedLayer);

      return rawPages.map((p, i) => {
        let disabled = false;
        if (selIdx !== -1 && p.writingChange) {
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
    this.evtModelService.rawPages$,
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
