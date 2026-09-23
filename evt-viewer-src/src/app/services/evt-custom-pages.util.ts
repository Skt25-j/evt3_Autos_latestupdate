import { BehaviorSubject } from 'rxjs';
import { Page } from '../models/evt-models';

/**
 * Custom page-pipeline patches (ported to source).
 *
 * - Page transpositions driven by <standOff><transpose><ptr> (listTranspose).
 * - Blank-page filtering (pages whose <pb type="blank"/>) for the critical view.
 * - Nearest-page navigation fallback.
 *
 * `evtPagesOverride$` lets the text panel push a reordered/filtered page list
 * that becomes the global `pages$` used across the app (navigation, counts...).
 */

export const evtPagesOverride$ = new BehaviorSubject<Page[] | null>(undefined);

export function evtGetOwnerDoc(pages: Page[]): Document | null {
  for (const p of pages || []) {
    const oc = p?.originalContent as any[];
    if (oc && oc.length) {
      for (const el of oc) {
        if (el && el.ownerDocument) { return el.ownerDocument; }
      }
    }
  }

  return null;
}

export function evtFilterBlankPages(pages: Page[], doc: Document | null): Page[] {
  try {
    if (!doc) { return pages; }

    return pages.filter((p) => {
      const el = doc.querySelector(`[*|id='${p.id}']`);

      return !(el && el.getAttribute('type') === 'blank');
    });
  } catch (err) {
    console.error('evt custom blank-page filter error', err);

    return pages;
  }
}

export function evtFindNearestPage(targetId: string, pages: Page[], doc: Document | null): Page {
  try {
    if (!doc || !pages || !pages.length) { return pages && pages[0]; }
    const targetEl = doc.querySelector(`[*|id='${targetId}']`);
    if (!targetEl) { return pages[0]; }
    const allPbs = Array.from(doc.querySelectorAll('pb'));
    const idx = allPbs.findIndex((el) => el === targetEl);
    if (idx === -1) { return pages[0]; }
    for (let i = idx + 1; i < allPbs.length; i++) {
      const id = allPbs[i].getAttribute('xml:id');
      if (id) { const found = pages.find((p) => p.id === id); if (found) { return found; } }
    }
    for (let i = idx - 1; i >= 0; i--) {
      const id = allPbs[i].getAttribute('xml:id');
      if (id) { const found = pages.find((p) => p.id === id); if (found) { return found; } }
    }

    return pages[0];
  } catch (err) {
    console.error('evt nearest-page fallback error', err);

    return pages && pages[0];
  }
}

export function evtApplyTranspositions(pages: Page[], doc: Document | null): Page[] {
  try {
    if (!doc) { return pages; }
    const so = doc.querySelector('standOff');
    if (!so) { return pages; }
    const trs = Array.from(so.querySelectorAll('transpose'));
    if (!trs.length) { return pages; }
    const idOf = (el: any) => (el && el.getAttribute ? (el.getAttribute('xml:id') || '') : '');
    const idxOf = (id: string) => {
      const direct = pages.findIndex((p) => p.id === id);
      if (direct !== -1) { return direct; }

      return pages.findIndex((p) => {
        const oc = (p.originalContent as any[]) || [];

        return oc.some((el) => el && el.nodeType === 1 &&
          (idOf(el) === id || (el.querySelector && el.querySelector(`[*|id='${id}']`))));
      });
    };
    trs.forEach((tr) => {
      const ids = Array.from(tr.querySelectorAll('ptr')).map((p) => (p.getAttribute('target') || '').replace('#', ''));
      for (let k = 0; k < ids.length - 1; k++) {
        const bi = idxOf(ids[k]);
        const ai = idxOf(ids[k + 1]);
        if (bi === -1 || ai === -1 || ai === bi + 1) { continue; }
        const moved = pages.splice(ai, 1)[0];
        const nbi = idxOf(ids[k]);
        pages.splice(nbi + 1, 0, moved);
      }
    });
  } catch (err) {
    console.error('evt custom transpose patch error', err);
  }

  return pages;
}
