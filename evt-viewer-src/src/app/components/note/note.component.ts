import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { Note } from '../../models/evt-models';
import { register } from '../../services/component-register.service';
import { EditionLevelType } from 'src/app/app.config';
import { EVTStatusService } from '../../services/evt-status.service';

@Component({
  selector: 'evt-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
})
@register(Note)
export class NoteComponent implements OnInit, OnDestroy {
  @Input() data: Note;
  @Input() editionLevel: EditionLevelType;
  @Input() withDeletions: boolean;
  @Input() selectedLayer: string;
  // Nel testo corrente il content-viewer passa la fase corrente sotto la chiave `selLayer`
  // (non `selectedLayer`); teniamo entrambi per coprire tutti i contesti d'uso della nota.
  @Input() selLayer: string;
  @ViewChild('popover', { static: true }) popover: NgbPopover;

  public pinnerStyle = {
    'margin-right': '-0.65rem',
    'margin-top': '-0.35rem',
    float: 'right',
  };

  // Filtro-per-fase su @change della <note> (stessa logica di <mod> e dei blocchi
  // div/ab/seg): in changesView la nota compare solo dalla sua fase in poi. L'ordine
  // delle fasi arriva una volta da currentChanges$; la fase corrente dall'input (live).
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

  // Tipo di nota ai fini della RESA (colore icona + pop-up). Il parser marca come 'comment'
  // (viola) quasi tutto, incluse le note critiche del curatore: qui distinguiamo le note
  // critiche/editoriali (type="critical" o resp diverso da #TUS) come 'critical' (blu),
  // lasciando 'comment' (viola) solo alle note d'autore (#TUS). Fonti/analoghi non toccati.
  get displayNoteType(): string {
    const nt = this.data?.noteType;
    if (nt === 'analogue' || nt === 'source') { return nt; }
    const type = this.data?.attributes?.type;
    const resp = this.data?.attributes?.resp ?? '';
    const authorial = /TUS/i.test(resp);
    if (!authorial && (type === 'critical' || resp !== '')) { return 'critical'; }

    return nt;
  }

  private getLayerIndex(layer: string): number {
    if (layer) { return this.orderedLayers.indexOf(layer.replace('#', '')); }

    return 0;
  }

  // true = la nota va nascosta perche' la fase selezionata precede quella del suo @change.
  // Attiva SOLO in changesView e SOLO se la nota ha @change; altrimenti la nota resta
  // sempre visibile (comportamento invariato per tutte le note senza @change).
  layerHidden(): boolean {
    const change = this.data?.attributes?.change;
    if (this.editionLevel !== 'changesView' || !change) { return false; }
    if (this.orderedLayers.length === 0) { return false; }
    const current = this.selLayer ?? this.selectedLayer ?? this.orderedLayers[this.orderedLayers.length - 1];

    return this.getLayerIndex(current) < this.getLayerIndex(change);
  }

  onTriggerClicked(event: MouseEvent) {
    event.stopPropagation();
  }
}
