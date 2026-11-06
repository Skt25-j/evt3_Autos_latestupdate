import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppConfig } from 'src/app/app.config';

import { Paragraph } from '../../models/evt-models';
import { register } from '../../services/component-register.service';
import { EVTStatusService } from '../../services/evt-status.service';
import { EditionlevelSusceptible, Highlightable, ShowDeletionsSusceptible, TextFlowSusceptible } from '../components-mixins';

export interface ParagraphComponent extends EditionlevelSusceptible, Highlightable, TextFlowSusceptible, ShowDeletionsSusceptible { }

@Component({
  selector: 'evt-paragraph',
  templateUrl: './paragraph.component.html',
  styleUrls: ['./paragraph.component.scss'],
})

@register(Paragraph)
export class ParagraphComponent implements OnInit, OnDestroy {
  @Input() data: Paragraph;
  @Input() selectedLayer: string;

  // [Autos] Filtro-per-fase su @change del <p> in changesView (stessa logica di <mod>):
  // il paragrafo compare solo dalla sua fase in poi. Ordine fasi da currentChanges$.
  public orderedLayers: string[] = [];
  private layerSub: Subscription;

  // [Autos] Badge con la lettera della fase sui <p> con @change (come <mod> e i blocchi
  // <div>/<ab>/<seg>). Attivato dalla stessa opzione.
  public showLayerMarkers = AppConfig.evtSettings.edition.showChangeLayerMarkerInText;

  constructor(public evtStatusService: EVTStatusService) {}

  ngOnInit() {
    this.layerSub = this.evtStatusService.currentChanges$.subscribe(({ layerOrder }) => {
      this.orderedLayers = layerOrder || [];
    });
  }

  ngOnDestroy() {
    this.layerSub?.unsubscribe();
  }

  getLayerIndex(layer: string): number {
    if (layer) { return this.orderedLayers.indexOf(layer.replace('#', '')); }

    return 0;
  }

  layerHidden(): boolean {
    const change = this.data?.attributes?.change;
    if (this.editionLevel !== 'changesView' || !change) { return false; }
    if (this.orderedLayers.length === 0) { return false; }
    // [Autos] fase selezionata fuori dalla sequenza ordinata (strato "ordine incerto") ->
    // usa l'ultima fase ordinata, cosi' mostra il testo finale invece di nasconderlo.
    const sel = this.selectedLayer;
    const current = (sel && this.orderedLayers.indexOf(sel.replace('#', '')) !== -1)
      ? sel : this.orderedLayers[this.orderedLayers.length - 1];

    return this.getLayerIndex(current) < this.getLayerIndex(change);
  }

  // [Autos] Badge della fase: visibile in changesView, solo se il <p> ha @change ed e'
  // effettivamente visibile nella fase corrente (stessa condizione del filtro).
  showParagraphLayerMarker(): boolean {
    return this.editionLevel === 'changesView'
      && this.showLayerMarkers
      && !!this.data?.attributes?.change
      && !this.layerHidden();
  }

  // "strato-E" -> "E" (come mod.component / generic-element).
  getLayerLabel(layer: string): string {
    if (!layer) { return ''; }
    const clean = layer.replace('#', '');
    const parts = clean.split('-');

    return parts.length > 1 ? parts[parts.length - 1] : clean;
  }

  // "strato-E" -> "strato E" per il tooltip del badge.
  getLayerTitle(layer: string): string {
    return (layer || '').replace('#', '').replace('-', ' ');
  }

  getLayerColor(layer: string): string {
    const layerColors = AppConfig.evtSettings.edition.changeSequenceView.layerColors;
    const key = (layer || '').replace('#', '');

    return (key && layerColors && layerColors[key]) ? layerColors[key] : 'black';
  }
}
