import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { DisplayGrid, GridsterConfig, GridsterItem, GridType } from 'angular-gridster2';
import { combineLatest } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { AppConfig, EditionLevel } from '../../app.config';
import { Page, XMLImagesValues } from '../../models/evt-models';
import { ViewerSource } from '../../models/evt-polymorphic-models';
import { EVTModelService } from '../../services/evt-model.service';
import { EVTStatusService } from '../../services/evt-status.service';

@Component({
  selector: 'evt-documental-mixed',
  templateUrl: './documental-mixed.component.html',
  styleUrls: ['./documental-mixed.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentalMixedComponent implements OnInit {
  public layoutOptions: GridsterConfig = {
    gridType: GridType.Fit,
    displayGrid: DisplayGrid.None,
    margin: 0,
    maxCols: 2,
    maxRows: 1,
    draggable: {
      enabled: false,
      //ignoreContent: true,
      dragHandleClass: 'panel-header',
    },
    resizable: {
      enabled: false,
    },
  };
  public imagePanelItem: GridsterItem = { cols: 1, rows: 1, y: 0, x: 0 };
  public textPanelItem: GridsterItem = { cols: 1, rows: 1, y: 0, x: 1 };

  // combineLatest: le immagini si ricostruiscono quando pages$ cambia ordine.
  public imageViewer$ = combineLatest([this.evtModelService.surfaces$, this.evtModelService.pages$]).pipe(
    map(([surface, pages]) => {
      const editionImages = AppConfig.evtSettings.files.editionImagesSource;
      for (const key of Object.keys(editionImages)) {
        if (editionImages[key].enable) {
          return ViewerSource.getDataType(key, surface);
        }
      }

      return {
        type: 'default',
        value: {
          xmlImages: pages.map((page) => ({ url: page.facsUrl })) as XMLImagesValues[],
        },
      };
    }),
    // evita ricostruzioni inutili dell'OSD: riemette solo se le immagini cambiano davvero
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );

  public currentEditionLevel$ = this.evtStatusService.currentStatus$.pipe(
    map(({ editionLevels }) => editionLevels[0]),
    shareReplay(1),
  );

  public currentPageID$ = this.evtStatusService.currentStatus$.pipe(
    map(({ page }) => page.id),
  );

  constructor(
    private evtStatusService: EVTStatusService,
    private evtModelService: EVTModelService,
  ) {
  }

  public lastLayer$ = this.evtStatusService.currentChanges$.pipe(
    distinctUntilChanged(),
    map(({ layerOrder }) => (AppConfig.evtSettings.edition.startingFromDefinitiveLayer) ?
      layerOrder[layerOrder.length-1] : ((layerOrder.length > 0) ? layerOrder[0] : null)),
  );

  changePage(selectedPage: Page) {
    this.evtStatusService.updatePage$.next(selectedPage);
  }

  changeLayer(selectedLayer: string) {
    this.evtStatusService.updateLayer$.next(selectedLayer);
  }

  changeEditionLevel(editionLevel: EditionLevel) {
    this.evtStatusService.updateEditionLevels$.next([editionLevel?.id]);
  }

  ngOnInit(): void {
    this.evtStatusService.updateEditionLevels$.next(['changesView']);
  }


}
