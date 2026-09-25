import { Component } from '@angular/core';
import { DisplayGrid, GridsterConfig, GridsterItem, GridType } from 'angular-gridster2';
import { combineLatest } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { AppConfig, EditionLevel } from '../../app.config';
import { Page, XMLImagesValues } from '../../models/evt-models';
import { ViewerSource } from '../../models/evt-polymorphic-models';
import { EVTModelService } from '../../services/evt-model.service';
import { EVTStatusService } from '../../services/evt-status.service';

@Component({
  selector: 'evt-image-text',
  templateUrl: './image-text.component.html',
  styleUrls: ['./image-text.component.scss'],
})
export class ImageTextComponent {
  public layoutOptions: GridsterConfig = {
    gridType: GridType.Fit,
    displayGrid: DisplayGrid.None,
    margin: 0,
    maxCols: 2,
    maxRows: 1,
    draggable: {
      enabled: false,
      ignoreContent: true,
      dragHandleClass: 'panel-header',
    },
    resizable: {
      enabled: false,
    },
  };
  public imagePanelItem: GridsterItem = { cols: 1, rows: 1, y: 0, x: 0 };
  public textPanelItem: GridsterItem = { cols: 1, rows: 1, y: 0, x: 1 };

  // NB: combineLatest (non withLatestFrom su surfaces$) così le immagini si
  // ricostruiscono quando pages$ cambia ordine (trasposizioni in vista critica),
  // restando allineate all'indice di pagina usato dall'OSD.
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

  public currentPageID$ = this.evtStatusService.currentStatus$.pipe(
    map(({ page }) => page.id),
  );

  public currentEditionLevel$ = this.evtStatusService.currentStatus$.pipe(
    map(({ editionLevels }) => editionLevels[0]),
    shareReplay(1),
  );

  constructor(
    private evtStatusService: EVTStatusService,
    private evtModelService: EVTModelService,
  ) {
  }

  changePage(selectedPage: Page) {
    this.evtStatusService.updatePage$.next(selectedPage);
  }

  changeEditionLevel(editionLevel: EditionLevel) {
    this.evtStatusService.updateEditionLevels$.next([editionLevel?.id]);
  }
}
