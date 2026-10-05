import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { Mod, Reading } from 'src/app/models/evt-models';
import { EditionlevelSusceptible, Highlightable, ShowDeletionsSusceptible, TextFlowSusceptible } from '../../components-mixins';
import { ChangeDetectionStrategy } from '@angular/core';
import { AppConfig, EditionLevelType } from 'src/app/app.config';
import { BehaviorSubject, distinctUntilChanged, map, scan, startWith, Subject, Subscription } from 'rxjs';
import { EVTStatusService } from 'src/app/services/evt-status.service';

export interface ModGroupComponent extends EditionlevelSusceptible, Highlightable, TextFlowSusceptible, ShowDeletionsSusceptible { }

@Component({
  selector: 'evt-mod-group',
  templateUrl: './mod-group.component.html',
  styleUrls: ['../mod-detail/mod-detail.component.scss','../../sources/sources.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})

export class ModGroupComponent implements OnInit, OnDestroy {

  public changeSeparatorVisible = AppConfig.evtSettings.edition.showSeparatorBetweenChanges;
  public showVarSeqAttr = AppConfig.evtSettings.edition.changeSequenceView.showVarSeqAttr;

  public mods: Mod[];

  public orderedLayers: string[];

  public selLayer: string|undefined;

  // [Autos] Fase selezionata presa dal servizio (fonte di verita' del selettore),
  // per sapere quali lezioni sono visibili nella fase corrente.
  private statusSelectedLayer: string|undefined;
  private changesSub?: Subscription;

  public opened = false;

  toggleOpened$ = new Subject<boolean | void>();
  opened$ = this.toggleOpened$.pipe(
    scan((currentState: boolean, val: boolean | undefined) => val === undefined ? !currentState : val, false),
    startWith(false),
  );

  public reversedLayers$ = this.evtStatusService.currentChanges$.pipe(
    distinctUntilChanged(),
    map(({ layerOrder }) => {
      this.orderedLayers = layerOrder;

      return layerOrder.slice().reverse();
    } ),
  );

  @Input() withDeletions: boolean;

  @Input() orderedReadings: Reading[]

  @Input() set selectedLayer(layer: string|undefined) {
    this.selLayer = layer;
  }
  get selectedLayers() { return this.selLayer; }

  @Input() set modGroup(el: Mod[]) {
    this.mods = el;
  }
  get modGroup() { return this.mods; }

  @Input() set editionLevel(el: EditionLevelType) {
    this.editionLevelChange.next(el);
  }

  editionLevelChange = new BehaviorSubject<EditionLevelType | ''>('');

  @Input() containerElement;

  getLayerIndex(layer): number {
    if (layer) {
      layer = layer.replace('#','');

      return this.orderedLayers.indexOf(layer);
    }

    return 0;

  }

  toggleModGroupEntryBox() {
    this.opened = !this.opened;
  }

  ngOnInit() {
    // Teniamo aggiornati layerOrder e fase selezionata in modo affidabile
    // (il box potrebbe non essere aperto, quindi non possiamo dipendere dall'async pipe).
    this.changesSub = this.evtStatusService.currentChanges$
      .pipe(distinctUntilChanged())
      .subscribe(({ next: (data) => {
        this.orderedLayers = data?.layerOrder ?? this.orderedLayers;
        this.statusSelectedLayer = data?.selectedLayer;
      } }));
  }

  ngOnDestroy() {
    this.changesSub?.unsubscribe();
  }

  // [Autos] Fase effettiva. La fonte di verita' LIVE e' updateLayer$ (il BehaviorSubject
  // del selettore di fase): lo leggiamo in modo sincrono a ogni valutazione, cosi' il
  // calcolo delle frecce segue sempre la fase realmente visualizzata (currentChanges$
  // non ri-emette al cambio fase, quindi una subscription una-tantum non basterebbe).
  // Ripieghi: valore dal servizio, @Input, e infine la PRIMA fase (default del filtro
  // pagina quando nessuna fase e' selezionata).
  private get effectiveLayer(): string|undefined {
    const live = this.evtStatusService.updateLayer$?.getValue();
    if (live) { return live; }
    if (this.statusSelectedLayer) { return this.statusSelectedLayer; }
    if (this.selLayer) { return this.selLayer; }
    if (this.orderedLayers && this.orderedLayers.length > 0) {
      return this.orderedLayers[0];
    }

    return undefined;
  }

  // [Autos] changeLayer della lezione = quello del suo <mod> interno.
  private getReadingLayer(reading: Reading): string|undefined {
    const content: Array<{ type?: unknown; changeLayer?: string }> = (reading as unknown as { content?: [] })?.content ?? [];
    const mod = content.find((c) => (c?.type === Mod) && !!c?.changeLayer);

    return mod?.changeLayer;
  }

  // [Autos] La lezione e' visibile nella fase corrente? In changesView una lezione
  // di una fase SUCCESSIVA a quella selezionata e' nascosta (come i suoi <mod>).
  isReadingVisible(reading: Reading): boolean {
    if (this.editionLevelChange.value !== 'changesView') { return true; }
    if (!this.orderedLayers || this.orderedLayers.length === 0) { return true; }
    const layer = this.getReadingLayer(reading);
    if (!layer) { return true; }
    const sel = this.effectiveLayer;
    if (!sel) { return true; }

    return this.getLayerIndex(sel) >= this.getLayerIndex(layer);
  }

  // [Autos] La freccia " > " va mostrata SOLO tra lezioni effettivamente visibili,
  // altrimenti le lezioni nascoste (fasi successive) lasciano frecce orfane ">>".
  showReadingSeparator(index: number): boolean {
    if (!this.changeSeparatorVisible || index === 0) { return false; }
    if (!this.isReadingVisible(this.orderedReadings[index])) { return false; }
    for (let j = 0; j < index; j++) {
      if (this.isReadingVisible(this.orderedReadings[j])) { return true; }
    }

    return false;
  }

  constructor(
    public evtStatusService: EVTStatusService,
  ) {}

}
