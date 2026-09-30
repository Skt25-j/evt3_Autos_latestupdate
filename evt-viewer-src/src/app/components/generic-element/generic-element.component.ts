import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { GenericElement } from '../../models/evt-models';
import { register } from '../../services/component-register.service';
import { EVTStatusService } from '../../services/evt-status.service';
import { EditionlevelSusceptible, Highlightable, ShowDeletionsSusceptible, TextFlowSusceptible } from '../components-mixins';

export interface GenericElementComponent extends EditionlevelSusceptible, Highlightable, TextFlowSusceptible, ShowDeletionsSusceptible { }

@Component({
  selector: 'evt-generic-element',
  templateUrl: './generic-element.component.html',
  styleUrls: ['./generic-element.component.scss'],
})
@register(GenericElement)
export class GenericElementComponent implements OnInit, OnDestroy {
  @Input() data: GenericElement;
  @Input() selectedLayer: string;

  // [Autos] Filtro-per-fase su @change dei blocchi (div, ab, seg): stessa logica di
  // <mod> in changesView, ma senza aprire la scheda dell'apparato. L'ordine delle fasi
  // arriva da currentChanges$; la fase corrente dall'input selectedLayer (live).
  public orderedLayers: string[] = [];
  private layerSub: Subscription;

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

  // Solo i blocchi "di passo" vengono filtrati per fase. La formattazione inline
  // (es. <hi>) e' anch'essa un generic element e puo' portare @change (la fase in cui
  // fu applicata la *formattazione*), ma il suo testo fu scritto prima e deve restare
  // visibile: quelli NON vanno filtrati.
  private static readonly FILTERABLE_BLOCKS = ['div', 'ab', 'seg'];

  layerHidden(): boolean {
    const change = this.data?.attributes?.change;
    if (this.editionLevel !== 'changesView' || !change) { return false; }
    if (!GenericElementComponent.FILTERABLE_BLOCKS.includes(this.data?.class)) { return false; }
    if (this.orderedLayers.length === 0) { return false; }
    const current = this.selectedLayer ?? this.orderedLayers[this.orderedLayers.length - 1];

    return this.getLayerIndex(current) < this.getLayerIndex(change);
  }

  // Formattazione inline (es. <hi rend="underline"> con @change): il testo resta
  // visibile, ma la formattazione deve comparire solo dalla sua fase in poi. Questa
  // classe viene aggiunta finche' quella fase non e' raggiunta; il CSS poi neutralizza
  // la formattazione (vedi custom-styles.css).
  @HostBinding('class.evt-change-pending') get changePending(): boolean {
    const change = this.data?.attributes?.change;
    if (this.editionLevel !== 'changesView' || !change) { return false; }
    if (GenericElementComponent.FILTERABLE_BLOCKS.includes(this.data?.class)) { return false; }
    if (this.orderedLayers.length === 0) { return false; }
    const current = this.selectedLayer ?? this.orderedLayers[this.orderedLayers.length - 1];

    return this.getLayerIndex(current) < this.getLayerIndex(change);
  }
}
