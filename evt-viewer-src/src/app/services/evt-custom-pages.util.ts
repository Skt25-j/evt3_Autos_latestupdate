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

// --- helpers for block-level transposition on parsed content (recursive, ---
// --- immutable "copy-on-write" along the path so shared cache is untouched) ---
function evtElemId(el: any): string | undefined {
  return el && el.attributes ? el.attributes.id : undefined;
}

function evtContainsId(content: any[], id: string): boolean {
  for (const el of content || []) {
    if (!el) { continue; }
    if (evtElemId(el) === id) { return true; }
    if (Array.isArray(el.content) && evtContainsId(el.content, id)) { return true; }
  }

  return false;
}

function evtRemoveById(content: any[], id: string): { content: any[]; removed: any } {
  let removed: any = null;
  const out: any[] = [];
  for (const el of content || []) {
    if (!removed && el && evtElemId(el) === id) { removed = el; continue; }
    if (!removed && el && Array.isArray(el.content) && evtContainsId(el.content, id)) {
      const r = evtRemoveById(el.content, id);
      removed = r.removed;
      out.push({ ...el, content: r.content });
    } else {
      out.push(el);
    }
  }

  return { content: out, removed };
}

function evtInsertAfterId(content: any[], id: string, block: any): { content: any[]; done: boolean } {
  let done = false;
  const out: any[] = [];
  for (const el of content || []) {
    if (!done && el && evtElemId(el) === id) {
      out.push(el);
      out.push(block);
      done = true;
    } else if (!done && el && Array.isArray(el.content) && evtContainsId(el.content, id)) {
      const r = evtInsertAfterId(el.content, id, block);
      out.push({ ...el, content: r.content });
      done = r.done;
    } else {
      out.push(el);
    }
  }

  return { content: out, done };
}

export function evtApplyTranspositions(pages: Page[], doc: Document | null): Page[] {
  try {
    if (!doc) { return pages; }
    const so = doc.querySelector('standOff');
    if (!so) { return pages; }
    const trs = Array.from(so.querySelectorAll('transpose'));
    if (!trs.length) { return pages; }

    // Doc-order snapshot: never reordered, so allPbs[i] <-> pagesOrig[i] holds
    // for the whole run and page resolution stays correct across transpositions.
    const pagesOrig = pages.slice();
    const allPbs = Array.from(doc.querySelectorAll('pb'));

    // Resolve a <ptr> target to a *page* (Page object, stable under reordering).
    // Accepts three encodings:
    //   1. target on the <pb> itself           -> that page (legacy behaviour)
    //   2. target on an element WRAPPING a <pb> -> the page of the wrapped <pb>
    //      (e.g. <div type="page" xml:id="...">: the transposition is expressed
    //       on a *critical* unit, the <div>, instead of the *diplomatic* <pb>).
    //   3. anything else                        -> null (it is an inner content
    //      block, handled by the block-relocation branch below).
    const resolvePage = (id: string): Page | null => {
      let p = pagesOrig.find((pg) => pg.id === id);
      if (p) { return p; }
      const el = doc.querySelector(`[*|id='${id}']`);
      if (!el) { return null; }
      const pb = (el.tagName && el.tagName.toLowerCase() === 'pb') ? el : el.querySelector('pb');
      if (!pb) { return null; }
      const pbId = pb.getAttribute('xml:id');
      if (pbId) {
        p = pagesOrig.find((pg) => pg.id === pbId);
        if (p) { return p; }
      }
      // <pb> has no own xml:id: map by document order (parser builds one page per pb).
      const idx = allPbs.indexOf(pb as Element);
      if (idx !== -1 && idx < pagesOrig.length) { return pagesOrig[idx]; }

      return null;
    };

    const pageContainingBlock = (id: string) =>
      pages.findIndex((p) => evtContainsId(p.parsedContent as any[], id));

    trs.forEach((tr) => {
      const ids = Array.from(tr.querySelectorAll('ptr')).map((p) => (p.getAttribute('target') || '').replace('#', ''));
      for (let k = 0; k < ids.length - 1; k++) {
        const idA = ids[k];
        const idB = ids[k + 1];
        const pgA = resolvePage(idA);
        const pgB = resolvePage(idB);

        // Both targets are pages (<pb> or a <div>/element wrapping a <pb>):
        // reorder the page array using object identity (robust to prior moves).
        if (pgA && pgB) {
          const ib = pages.indexOf(pgB);
          const ia = pages.indexOf(pgA);
          if (ib === -1 || ia === -1 || ib === ia + 1) { continue; }
          pages.splice(ib, 1);
          pages.splice(pages.indexOf(pgA) + 1, 0, pgB);
          continue;
        }

        // Block-level: relocate content block B right after element A (block or
        // page), possibly across pages, at any nesting depth.
        const piB = pageContainingBlock(idB);
        if (piB === -1) { continue; }
        const piAblock = pageContainingBlock(idA);
        const piApage = pgA ? pages.indexOf(pgA) : -1;
        if (piAblock === -1 && piApage === -1) { continue; }

        const rem = evtRemoveById(pages[piB].parsedContent as any[], idB);
        if (!rem.removed) { continue; }
        pages[piB] = { ...pages[piB], parsedContent: rem.content } as Page;

        if (piAblock !== -1) {
          const ins = evtInsertAfterId(pages[piAblock].parsedContent as any[], idA, rem.removed);
          pages[piAblock] = { ...pages[piAblock], parsedContent: ins.content } as Page;
        } else {
          pages[piApage] = {
            ...pages[piApage],
            parsedContent: [...((pages[piApage].parsedContent as any[]) || []), rem.removed],
          } as Page;
        }
      }
    });
  } catch (err) {
    console.error('evt custom transpose patch error', err);
  }

  return pages;
}
