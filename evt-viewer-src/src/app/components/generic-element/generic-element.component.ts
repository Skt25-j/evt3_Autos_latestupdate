import { Component, Input, OnDestroy, OnInit } from '@angular/core';
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

  // Layer filtering for @change on block elements (div, ab, seg): same behaviour
  // as <mod> in changesView (content shown only from its change layer onward) but
  // without opening the apparatus window.
  public orderedLayers: string[] = [];
  public currentLayer: string;
  private layerSub: Subscription;

  constructor(public evtStatusService: EVTStatusService) {}

  ngOnInit() {
    if (!this.data?.attributes?.change) { return; }
    this.layerSub = this.evtStatusService.currentChanges$.subscribe(({ selectedLayer, layerOrder }) => {
      this.orderedLayers = layerOrder || [];
      this.currentLayer = selectedLayer ?? (this.orderedLayers.length ? this.orderedLayers[this.orderedLayers.length - 1] : undefined);
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
    if (this.orderedLayers.length > 0) {
      return this.getLayerIndex(this.currentLayer) < this.getLayerIndex(change);
    }

    return false;
  }
}
