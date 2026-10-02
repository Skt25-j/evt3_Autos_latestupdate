import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'evt-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss'],
})
export class PanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() comparable: boolean;
  @Input() secondary: boolean;
  @Input() closable: boolean;
  @Input() hideHeader: boolean;
  @Input() hideFooter: boolean;
  @Input() noPadding: boolean;
  @Input() showSecondaryContent: boolean;

  @Output() hide: EventEmitter<boolean> = new EventEmitter();
  @Output() scrollContent: EventEmitter<Event> = new EventEmitter();

  // [Autos] contenitore scrollabile del pannello (per registrare lo scroll fuori zona)
  @ViewChild('panelContent') panelContent: ElementRef<HTMLElement>;
  // tslint:disable-next-line: variable-name
  private _scrollListener?: (e: Event) => void;

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    this.comparable = this.comparable === undefined ? false : this.comparable;
    this.secondary = this.secondary === undefined ? false : this.secondary;
    this.closable = this.closable === undefined ? false : this.closable;
    this.hideHeader = this.hideHeader === undefined ? false : this.hideHeader;
    this.hideFooter = this.hideFooter === undefined ? false : this.hideFooter;
    this.showSecondaryContent = this.showSecondaryContent === undefined ? false : this.showSecondaryContent;
  }

  ngAfterViewInit() {
    // [Autos] Lo scroll e' registrato FUORI dalla zona Angular: prima il binding
    // (scroll) nel template faceva scattare il change detection a OGNI frame di
    // scorrimento, rendendolo scattoso. Nei livelli attivi lo scroll non aggiorna la
    // UI (l'indicatore pagina-da-scroll e' solo per l'edizione critica, disattivata),
    // quindi emettere fuori zona e' sicuro e lo scorrimento resta fluido.
    const el = this.panelContent?.nativeElement;
    if (el) {
      this._scrollListener = (e: Event) => this.scrollContent.emit(e);
      this.ngZone.runOutsideAngular(() => el.addEventListener('scroll', this._scrollListener, { passive: true }));
    }
  }

  ngOnDestroy() {
    const el = this.panelContent?.nativeElement;
    if (el && this._scrollListener) {
      el.removeEventListener('scroll', this._scrollListener);
    }
  }

  isSecondaryContentOpened(): boolean {
    return this.showSecondaryContent;
  }

  emitHide() {
    this.hide.emit(true);
  }
}
