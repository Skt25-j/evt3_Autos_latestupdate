import { Component, ElementRef, HostBinding, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppConfig } from './app.config';
import { ThemesService } from './services/themes.service';
import { ShortcutsService } from './shortcuts/shortcuts.service';
import { EvtIconInfo } from './ui-components/icon/icon.component';
import { EVTStatusService } from './services/evt-status.service';

@Component({
  selector: 'evt-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  @ViewChild('mainSpinner') mainSpinner: ElementRef;
  private subscriptions: Subscription[] = [];
  // [Autos] gestione spinner "debounced" per i cambi vista (vedi costruttore)
  private spinnerTimer: ReturnType<typeof setTimeout> | undefined;
  private spinnerShown = false;
  public hasNavBar = AppConfig.evtSettings.ui.enableNavBar;
  public navbarOpened$ = new BehaviorSubject(this.hasNavBar && AppConfig.evtSettings.ui.initNavBarOpened);


  public navbarTogglerIcon$: Observable<EvtIconInfo> = this.navbarOpened$.pipe(
    map((opened: boolean) => opened ? { icon: 'caret-down', iconSet: 'fas' } : { icon: 'caret-up', iconSet: 'fas' }),
  );

  constructor(
    private router: Router,
    private spinner: NgxSpinnerService,
    private shortcutsService: ShortcutsService,
    private themes: ThemesService,
    private titleService: Title,
    private evtStatusService: EVTStatusService,

  ) {

    this.evtStatusService.currentViewMode$.pipe().subscribe((view) => {
      // [Autos] La barra di navigazione globale (in basso) va nascosta non solo in
      // synopticEdition, ma anche in imageImage e imageOnly: quelle viste hanno gia'
      // una barra di navigazione indipendente SOTTO OGNI immagine (indipendentNavBar),
      // quindi la barra unica globale era un doppione.
      const viewsWithoutGlobalNavBar = ['synopticEdition', 'imageImage', 'imageOnly'];
      if (view !== undefined && viewsWithoutGlobalNavBar.includes(view.id)) {
        this.navbarOpened$.next(false);
        this.hasNavBar = false;
      } else {
        this.navbarOpened$.next(true);
        this.hasNavBar = true;
      }
    });
    // [Autos] Lo spinner a tutto schermo veniva mostrato a OGNI NavigationStart e
    // nascosto al NavigationEnd. I passaggi tra viste sono navigazioni client-side
    // quasi istantanee: mostrare+nascondere l'overlay scuro in pochi millisecondi
    // produceva un "lampo" scuro a ogni cambio di visualizzazione (l'effetto scattoso),
    // e per giunta non copriva nemmeno il parsing dei dati (che avviene dopo il
    // NavigationEnd). Ora lo spinner parte solo se la navigazione supera una soglia:
    // i cambi vista rapidi non lampeggiano piu', mentre un'eventuale navigazione
    // lenta mostra ancora l'indicatore.
    this.router.events.subscribe((event) => {
      switch (true) {
        case event instanceof NavigationStart:
          if (this.spinnerTimer) { clearTimeout(this.spinnerTimer); }
          this.spinnerTimer = setTimeout(() => {
            this.spinnerShown = true;
            this.spinner.show();
          }, 250);
          break;
        case event instanceof NavigationEnd:
        case event instanceof NavigationCancel:
        case event instanceof NavigationError:
          if (this.spinnerTimer) { clearTimeout(this.spinnerTimer); this.spinnerTimer = undefined; }
          if (this.spinnerShown) { this.spinnerShown = false; this.spinner.hide(); }
          break;
        default:
          break;
      }
    });
    this.titleService.setTitle(AppConfig.evtSettings.edition.editionTitle || 'EVT');
  }

  @HostBinding('attr.data-theme') get dataTheme() { return this.themes.getCurrentTheme().value; }

  toggleToolbar() {
    this.navbarOpened$.next(!this.navbarOpened$.getValue());
    window.dispatchEvent(new Event('resize')); // Needed to tell Gridster to resize
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(e: KeyboardEvent) {
    this.shortcutsService.handleKeyboardEvent(e);
  }
}
