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
  // The content viewer passes the current layer under the key `selLayer`.
  @Input() selLayer: string;

  // Layer filtering for @change on block elements (div, ab, seg): same as <mod>
  // in changesView without opening the apparatus window. Order once from
  // currentChanges$; current layer from the selectedLayer input (live).
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

  // Only block-level "passage" elements are phase-filtered. Inline formatting
  // such as <hi> also renders as a generic element and can carry @change (the
  // phase in which the *formatting* was applied), but its text was written earlier
  // and must stay visible: those must NOT be filtered.
  private static readonly FILTERABLE_BLOCKS = ['div', 'ab', 'seg'];

  layerHidden(): boolean {
    const change = this.data?.attributes?.change;
    if (this.editionLevel !== 'changesView' || !change) { return false; }
    if (!GenericElementComponent.FILTERABLE_BLOCKS.includes(this.data?.class)) { return false; }
    if (this.orderedLayers.length === 0) { return false; }
    const current = this.selLayer ?? this.orderedLayers[this.orderedLayers.length - 1];

    return this.getLayerIndex(current) < this.getLayerIndex(change);
  }
}
