import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { VersesGroup } from '../../models/evt-models';
import { register } from '../../services/component-register.service';
import { EVTModelService } from '../../services/evt-model.service';
import { EVTStatusService } from '../../services/evt-status.service';
import { EditionlevelSusceptible, Highlightable, ShowDeletionsSusceptible } from '../components-mixins';

export interface VersesGroupComponent extends EditionlevelSusceptible, Highlightable, ShowDeletionsSusceptible { }

@Component({
  selector: 'evt-verses-group',
  templateUrl: './verses-group.component.html',
  styleUrls: ['./verses-group.component.scss'],
})
@register(VersesGroup)
export class VersesGroupComponent implements OnInit, OnDestroy {
  @Input() data: VersesGroup;
  // The content viewer passes the current layer under the key `selLayer`.
  @Input() selLayer: string;

  // Phase filtering for @change on <lg>: same behaviour as p/div/ab in changesView.
  public orderedLayers: string[] = [];
  private layerSub: Subscription;

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
    const current = this.selLayer ?? this.orderedLayers[this.orderedLayers.length - 1];

    return this.getLayerIndex(current) < this.getLayerIndex(change);
  }

  get displayBlock$() {
    return this.evtModelService.lines$.pipe(
      map((lines) => lines.length > 0),
      map((hasLines) => {
        // In diplomatic and interpretative edition, if the text doesn't have any line, verses group are shown as block items
        // In critical edition verses are always shown as block items
        switch (this.editionLevel) {
          case 'changesView':
          case 'diplomatic':
          case 'interpretative':
            return !hasLines;
          case 'critical':
            return true;
        }
      }),
    );
  }

  constructor(
    private evtModelService: EVTModelService,
    public evtStatusService: EVTStatusService,
  ) {
  }

}
