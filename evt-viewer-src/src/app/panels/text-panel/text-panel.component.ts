import { Component, ElementRef, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, merge, Observable, Subject, Subscription } from 'rxjs';
import { delay, distinctUntilChanged, filter, map, shareReplay, skip, tap, withLatestFrom } from 'rxjs/operators';
import { EvtLinesHighlightService } from 'src/app/services/evt-lines-highlight.service';
import { KeyboardService } from 'src/app/services/keyboard.service';
import { StructureXmlParserService } from 'src/app/services/xml-parsers/structure-xml-parser.service';
import { AppConfig, EditionLevel, EditionLevelType, TextFlow } from '../../app.config';
import { EntitiesSelectItem } from '../../components/entities-select/entities-select.component';
import { Page } from '../../models/evt-models';
import { EVTModelService } from '../../services/evt-model.service';
import { EVTStatusService } from '../../services/evt-status.service';
import { EvtIconInfo } from '../../ui-components/icon/icon.component';

type SecondaryContent = 'search' | 'info';

@Component({
  selector: 'evt-text-panel',
  templateUrl: './text-panel.component.html',
  styleUrls: ['./text-panel.component.scss'],
})
export class TextPanelComponent implements OnDestroy {
  // tslint:disable-next-line: variable-name
  private _mc: ElementRef;
  @ViewChild('mainContent')
  set mainContent(el: ElementRef) {
    this._mc = el;
    if (this.pageID) {
      this._scrollToPage(this.pageID);
    }
  }
  get mainContent() {
    return this._mc;
  }

  public selLayer: string;
  @Input() set selectedLayer(layer: string) {
    this.selLayer = layer;
    this.evtStatusService.updateLayer$.next(layer);
  }
  get selectedLayer() { return this.selLayer; }

  // [Autos] Legenda delle fasi/strati per la sezione Info: coppie fase -> colore lette
  // direttamente dalla configurazione (changeSequenceView.layerColors), cosi' restano
  // allineate ai colori usati nella vista "changes" senza duplicare i valori.
  get phaseLegend(): Array<{ id: string; color: string; label: string }> {
    const colors = AppConfig.evtSettings?.edition?.changeSequenceView?.layerColors || {};

    return Object.keys(colors).map((id) => ({
      id,
      color: colors[id],
      // "fase-A" -> "Fase A", "strato-E" -> "Strato E"
      label: id.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase()),
    }));
  }

  @Input() hideEditionLevelSelector: boolean;

  @Input() showChangeLayerSelector: boolean;

  @Input() enableHideDeletionsToggler: boolean;

  @Input() pageID: string;
  updatePageFromScroll$ = new BehaviorSubject<void>(undefined);
  updatePage$ = new BehaviorSubject<Page>(undefined);

  public currentPage$ = merge(
    this.updatePageFromScroll$.pipe(
      withLatestFrom(this.evtModelService.pages$, this.evtStatusService.currentPage$),
      map(([, pages, currentPage]) => {
        if (this.mainContent && this.editionLevelID === 'critical') {
          const mainContentEl: HTMLElement = this.mainContent.nativeElement;
          const pbs = mainContentEl.querySelectorAll('evt-page');
          let pbCount = 0;
          let pbVisible = false;
          let pbId = '';
          const docViewTop = mainContentEl.scrollTop;
          const docViewBottom = docViewTop + mainContentEl.parentElement.clientHeight;
          while (pbCount < pbs.length && !pbVisible) {
            pbId = pbs[pbCount].getAttribute('data-id');
            const pbElem = mainContentEl.querySelector<HTMLElement>(`evt-page[data-id="${pbId}"]`);
            const pbRect = pbElem.getBoundingClientRect();
            if (pbRect.top && (pbRect.top <= docViewBottom) && (pbRect.top >= docViewTop)) {
              pbVisible = true;
            } else {
              pbCount++;
            }
          }
          if (pbVisible && currentPage?.id !== pbId) {
            this.updatingPageFromScroll = true;
            currentPage = pages.find((p) => p.id === pbId);
          }
        }

        return currentPage;
      }),
    ),
    this.updatePage$,
  ).pipe(
    distinctUntilChanged((x, y) => x?.id === y?.id),
  );
  public currentPageId$ = this.currentPage$.pipe(
    map((p) => p?.id),
  );
  @Output() pageChange: Observable<Page> = this.currentPage$.pipe(
    filter((p) => !!p),
    tap((page) => this._scrollToPage(page?.id)),
  );

  // tslint:disable-next-line: variable-name
  private _edLevel: EditionLevelType;
  @Input() public set editionLevelID(e: EditionLevelType) {
    // [Autos] livello precedente, per capire se questo e' un cambio reale (non il boot):
    // in tal caso dopo il re-render dobbiamo ripristinare la posizione della pagina.
    const prev = this._edLevel;
    this._edLevel = e;
    // [Autos] Il flusso testo (prose/verse) viene reimpostato al default del livello sia
    // al boot sia a ogni CAMBIO di livello: cosi' entrando in critica si applica "verses"
    // (i versi vanno a capo) e tornando in diplomatica "prose". Prima si impostava solo
    // al boot (!this.textFlow), quindi il default per-livello non scattava cambiando vista.
    if (e && (!this.textFlow || prev !== e)) {
      this.textFlow = this.defaultTextFlow;
    }
    // [Autos] Visibilita' predefinita delle cancellature per livello: in diplomatica
    // e in changes i <del> si vedono (barrati, come scritti nel manoscritto); in critica
    // no, perche' si legge la lezione finale. Si reimposta a ogni cambio di livello;
    // l'utente puo' comunque usare il toggle "mostra/nascondi cancellature".
    if (e) {
      this.showDeletions = (e === 'diplomatic' || e === 'changesView');
    }
    // [Autos] Popola il livello di rendering direttamente dall'Input (che riflette
    // lo stato autorevole dell'app: URL `el` o scelta utente gia' propagata dal
    // servizio). Nello stock currentEdLevel$ era alimentato SOLO dall'evento
    // selectionChange del selettore: da quando il selettore emette solo sui click
    // reali (per rompere l'anello di retroazione sul livello), quell'evento non
    // parte piu' al boot e il pannello restava vuoto. Qui il rendering non dipende
    // piu' dal "rimbalzo" del selettore. Non alimentiamo editionLevelChange da qui
    // (vedi userEdLevel$), cosi' la sincronizzazione dell'Input non ripubblica il
    // livello verso updateEditionLevels$.
    if (e) {
      const obj = (AppConfig.evtSettings.edition.availableEditionLevels || []).find((l) => l.id === e);
      if (obj) {
        this.currentEdLevel$.next(obj);
      }
    }
    // [Autos] Cambio livello REALE (non boot): il contenitore #mainContent e' statico,
    // viene ricostruita solo la pagina interna, quindi ne' il setter ViewChild ne'
    // currentPage$ (stessa pagina) riattivano lo scroll -> la vista "ripartiva
    // dall'inizio". Ripristiniamo la posizione sulla pagina corrente dopo il re-render.
    if (e && prev && prev !== e) {
      this._restoreScrollAfterRender();
    }
  }
  public get editionLevelID() {
    return this._edLevel;
  }

  public currentEdLevel$ = new BehaviorSubject<EditionLevel>(undefined);
  public currentEdLevelId$ = this.currentEdLevel$.pipe(
    map((e) => e?.id),
  );
  // [Autos] Solo i cambi di livello iniziati dall'utente dal selettore: alimentano
  // l'output editionLevelChange (-> updateEditionLevels$). Separato da currentEdLevel$
  // per evitare che la sincronizzazione dell'Input rimbalzi e resetti il livello.
  public userEdLevel$ = new Subject<EditionLevel>();
  @Output() editionLevelChange: Observable<EditionLevel> = this.userEdLevel$.pipe(
    filter((e) => !!e),
    distinctUntilChanged(),
  );

  // [Autos] chiave dell'ultimo override pubblicato (per evitare push ripetuti su pages$)
  public currentStatus$ = combineLatest([
    this.evtModelService.pages$,
    this.currentPage$,
    this.currentEdLevel$,
    this.evtStatusService.currentViewMode$,
  ]).pipe(
    delay(0),
    filter(([pages, currentPage, editionLevel, currentViewMode]) => !!pages && !!currentPage && !!editionLevel && !!currentViewMode),
    map(([pages, currentPage, editionLevel, currentViewMode]) => ({ pages, currentPage, editionLevel, currentViewMode })),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay(1),
  );

  public itemsToHighlight$ = new Subject<EntitiesSelectItem[]>();
  secondaryContent: SecondaryContent | null = null;
  isSecondaryContentShown = () => !!this.secondaryContent;

  public enableProseVersesToggler = AppConfig.evtSettings.edition.proseVersesToggler;
  get defaultTextFlow() {
    if (!this.enableProseVersesToggler) {
      return undefined;
    }
    // [Autos] In critica (interpretative) e nella critical il default e' "verses" cosi' i
    // versi (<l>) vanno a capo mentre la prosa resta prosa (in critica gli <lb> sono
    // inline, quindi la prosa non viene spezzata). Non usiamo config.defaultTextFlow qui
    // perche' e' "prose" e in critica vogliamo la vista mista con i versi. L'utente puo'
    // comunque passare a "prose" col toggler. Le altre viste restano "prose" di default.
    if (this.editionLevelID === 'critical' || this.editionLevelID === 'interpretative') {
      return 'verses';
    }

    return AppConfig.evtSettings.edition.defaultTextFlow || 'prose';
  }
  // tslint:disable-next-line: variable-name
  private _tf: TextFlow;
  public set textFlow(tf: TextFlow) {
    this._tf = tf;
  }
  public get textFlow() {
    return this._tf;
  }

  private _dl: boolean;
  public set showDeletions(dl: boolean) {
    this._dl = dl;
  }
  public get showDeletions() {
    return this._dl;
  }

  public get hideDeletionsTogglerIcon(): EvtIconInfo {
    return { icon: (this.showDeletions) ? 'eye' : 'eye-slash', iconSet: 'fas' };
  }

  public isMultiplePageActive: boolean = AppConfig.evtSettings.edition.multiPageEngineForCriticalEdition;

  public isMultiplePageFlow$ = this.currentStatus$.pipe(
    map((x) => x.editionLevel.id === 'critical' && x.currentViewMode.id !== 'imageText' && this.isMultiplePageActive),
    shareReplay(1),
  );

  private updatingPageFromScroll = false;

  front = this.structureService.parsedFront;
  private readonly hideSecondaryContentSub: Subscription;

  constructor(
    public evtModelService: EVTModelService,
    public evtStatusService: EVTStatusService,
    public highlightService: EvtLinesHighlightService,
    public structureService: StructureXmlParserService,
    public keyboardService: KeyboardService,
  ) {
    this.hideSecondaryContentSub = merge(
      this.keyboardService.escape$,
      this.evtStatusService.currentPage$.pipe(
        skip(1)
      )
    ).subscribe((_) => this.secondaryContent = null);
  }

  toggleSecondaryContent(content: SecondaryContent) {
    if (this.secondaryContent !== content) {
      this.secondaryContent = content;
    }
    else {
      this.secondaryContent = null;
    }
  }

  toggleProseVerses(mode: TextFlow) {
    this.textFlow = mode;
  }

  toggleHideDeletions() {
    this.showDeletions = !this.showDeletions;
  }

  updateSelectedLayer(layer: string) {
    this.selectedLayer = layer;
  }

  // [Autos] Cambio livello iniziato dall'utente dal selettore: aggiorna subito il
  // rendering e propaga verso l'esterno (updateEditionLevels$ tramite editionLevelChange).
  onUserEditionLevel(e: EditionLevel) {
    this.currentEdLevel$.next(e);
    this.userEdLevel$.next(e);
  }

  onPanelClicked(e: MouseEvent) {
    const target = e.target as HTMLElement;

    // If a part of a line is clicked, we don't want to clear the highlight
    // Before I've stopped propagation on the content viewer component, but
    // other components that uses it, like the named entity ref, needs the event propagation to open
    if (!target.closest('evt-text')) {
      this.highlightService.clearHighlight();
    }
  }

  // [Autos] Dopo un cambio di livello il contenuto viene ricostruito in modo asincrono
  // (currentStatus$ ha delay(0) + async pipe). Con due requestAnimationFrame lo scroll
  // avviene dopo il paint, quando la nuova pagina e' gia' nel DOM, cosi' il passaggio
  // (es. diplomatica->critica) resta sulla pagina corrente invece di ripartire in cima.
  private _restoreScrollAfterRender() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.pageID) {
        this._scrollToPage(this.pageID);
      }
    }));
  }

  private _scrollToPage(pageId: string) {
    if (this.updatingPageFromScroll) {
      this.updatingPageFromScroll = false;
    } else if (this.mainContent) {
      const mainContentEl: HTMLElement = this.mainContent.nativeElement;
      const pageEl = mainContentEl.querySelector<HTMLElement>(`[data-id="${pageId}"]`);
      if (pageEl) {
        pageEl.scrollIntoView();
      } else {
        mainContentEl.parentElement.scrollTop = 0;
      }
    }
  }

  ngOnDestroy(): void {
    this.hideSecondaryContentSub.unsubscribe();
  }
}