import { Component, Input, OnDestroy, Output } from '@angular/core';
import { BehaviorSubject, combineLatest, of, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { AppConfig, EditionLevel, EditionLevelType } from '../../app.config';
import { EvtIconInfo } from '../../ui-components/icon/icon.component';
import { EVTStatusService } from 'src/app/services/evt-status.service';

@Component({
  selector: 'evt-edition-level-selector',
  templateUrl: './edition-level-selector.component.html',
  styleUrls: ['./edition-level-selector.component.scss'],
})
export class EditionLevelSelectorComponent implements OnDestroy {
  private subscriptions: Subscription;
  public editionLevels = (AppConfig.evtSettings.edition.availableEditionLevels || []).filter((el) => el.enable);
  public selectableEditionLevels: EditionLevel[] = this.editionLevels.filter((el) => !el.hidden);

  private _edLevelID: EditionLevelType;
  @Input() set editionLevelID(p: EditionLevelType) {
    // [Autos] Il setter e' chiamato piu' volte durante il boot (undefined ->
    // default -> livello reale). Nello stock ogni chiamata apriva una NUOVA
    // sottoscrizione a currentViewMode$ senza chiudere le precedenti: le "orfane"
    // (con p=undefined catturato) ripartivano e ripubblicavano il livello di
    // fallback. Qui chiudiamo la precedente e ignoriamo il valore undefined.
    this.subscriptions?.unsubscribe();
    this.subscriptions = this.evtStatusService.currentViewMode$.subscribe((view) => {
      if (view !== undefined && (view.id === 'documentalMixed')) {
        // documental mixed only allows changesView
        this._edLevelID = 'changesView';
        this.selectedEditionLevel$.next('changesView');
      } else if (p !== undefined) {
        if (this.selectableEditionLevels.some((ed) => ed.id === p)) {
          this._edLevelID = p;
          this.selectedEditionLevel$.next(this._edLevelID);
        } else {
          // if the provided edition id doesn't exist (or is hidden/disabled)
          // fallback to a default edition
          this._edLevelID = this.selectableEditionLevels[0].id;
          this.selectedEditionLevel$.next(this._edLevelID);
        }
      }
    });
  }
  get editionLevelID() { return this._edLevelID; }

  // [Autos] Modello di visualizzazione del menu (ngModel): sincronizzato sia
  // dall'Input (stato app/URL) sia dal click utente. Serve solo alla vista.
  selectedEditionLevel$ = new BehaviorSubject<EditionLevelType>(undefined);

  // [Autos] Solo le scelte esplicite dell'utente. `selectionChange` deriva da qui
  // e NON da selectedEditionLevel$: cosi' la sincronizzazione dell'Input non
  // "rimbalza" verso updateEditionLevels$ creando un anello di retroazione che
  // riportava il livello al default sovrascrivendo l'`el` dell'URL.
  private userSelection$ = new Subject<EditionLevelType>();

  @Output() selectionChange = combineLatest([
    of(this.editionLevels),
    this.userSelection$.pipe(distinctUntilChanged()),
  ]).pipe(
    filter(([edLevels, edLevelID]) => !!edLevelID && !!edLevels && edLevels.length > 0),
    map(([edLevels, edLevelID]) => !!edLevelID ? edLevels.find((p) => p.id === edLevelID) || edLevels[0] : edLevels[0]),
    filter((e) => !!e),
  );

  icon: EvtIconInfo = {
    icon: 'layer-group', // TODO: Choose better icon
    additionalClasses: 'me-2',
  };

  stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  // [Autos] Scelta esplicita dell'utente dal menu: aggiorna la vista ed emette
  // verso l'esterno (unica via che alimenta selectionChange -> updateEditionLevels$).
  onUserChange(item: EditionLevel) {
    const id = item?.id;
    if (!id) { return; }
    this._edLevelID = id;
    this.selectedEditionLevel$.next(id);
    this.userSelection$.next(id);
  }

  ngOnDestroy() {
    this.subscriptions?.unsubscribe();
  }

  constructor(
    private evtStatusService: EVTStatusService,
  ){}

}
