import { Injectable } from '@angular/core';
import { parse, ParserRegister } from '.';
import { ChangeLayerData, XMLElement } from '../../models/evt-models';
import { createParser } from './parser-models';
import { ListChangeParser } from './header-parser';

@Injectable({
  providedIn: 'root',
})
export class ModParserService {

  private tagName = `.mod`;
  private parserName = 'evt-mod-parser';

  public buildChangeList(xml: XMLElement): ChangeLayerData {

    const listChangeParser = createParser(ListChangeParser, parse);

    const list = xml.querySelectorAll<XMLElement>('listChange');
    const parsedList = Array.from(list).filter((el) => el).map((el) => listChangeParser.parse(el));
    let layerOrder = [];
    // [Autos] change dei listChange NON ordinati (es. strati a cronologia indeterminata):
    // non entrano in layerOrder (non hanno posizione nella sequenza cumulativa), ma li
    // raccogliamo a parte per poterli comunque mostrare nel menu fasi, marcati "ordine
    // incerto". EVT di serie li ignorava del tutto.
    const unorderedLayers: string[] = [];

    for(let i=0; i < parsedList.length; i++) {
      const ids = (parsedList[i].content || []).map((change) => change?.id).filter((id) => !!id);
      if (parsedList[i].ordered) {
        layerOrder = ids;
      } else {
        unorderedLayers.push(...ids);
      }
    }

    return {
      list: parsedList,
      layerOrder: layerOrder,
      unorderedLayers: unorderedLayers,
      selectedLayer: layerOrder[layerOrder.length-1],
    };
  }

  public parseModEntries(document: XMLElement) {
    const ModParser = ParserRegister.get(this.parserName);

    return Array.from(document.querySelectorAll<XMLElement>(this.tagName))
      .map((bib) => ModParser.parse(bib));
  }

}

