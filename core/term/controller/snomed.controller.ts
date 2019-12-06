import * as SnomedMongo from './snomed.mongo';
import * as SnomedSnowstorm from './snomed.snowstorm';

import { snomed } from '../../../config.private';

export interface ISnomedController {
    /**
     * Devuelve un concepto snomed completo
     */
    getConcept(sctid: String, format?);

    filterRelationships(concept: any, options: { parent: Boolean });

    /**
     * Busca los hijos o descendientes de un concepto.
     */

    getChildren(sctid: String, options: { all?: Boolean, completed?: Boolean, leaf?: Boolean });

    /**
     * Procesa una expression ECL de Snomed y busca en la base de datos.
     */

    getConceptByExpression(expression: String, termSearch?: String | null, form?: String, languageCode?: String);

    /**
     * Busca un array de conceptos SNOMED.
     */

    getConcepts(conceptsIds: String[]);

    /**
     * Busca conceptos por un texto.
     * Para el buscador de RUP.
     */

    searchTerms(text: String, options: { semanticTags?: String[], languageCode?: 'es' | 'en' });
}

export let SnomedCtr: ISnomedController = null;

const adapter = {
    snowstorm: SnomedSnowstorm,
    mongo: SnomedMongo
};

SnomedCtr = adapter[snomed.adapter.toLowerCase()];

if (!SnomedCtr) {
    throw new Error('SNOMED_ADAPTER must be mongo or snowstorm');
}
