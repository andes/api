import * as express from 'express';
import { TextIndexModel, SnomedModel } from '../schemas/snomed';
import * as utils from '../../../utils/utils';
import * as SnomedCtr from '../controller/snomedCtr';
import * as configPrivate from './../../../config.private';
import { makeMongoQuery } from '../controller/grammar/parser';
import { toArray } from '../../../utils/utils';

const router = express.Router();


/**
 * Devuelve un concepto Entero
 */

router.get('/snomed/concepts/:sctid', async (req, res, next) => {
    const sctid = req.params.sctid;
    try {
        const concept = await SnomedCtr.getConcept(sctid);
        return res.json(concept);
    } catch (e) {
        return next(e);
    }
});

/**
 * Devuelve un listado de conceptos
 */

router.get('/snomed/concepts', async (req, res, next) => {
    const sctids =  Array.isArray(req.query.sctids) ? req.query.sctids : [req.query.sctids];
    try {
        const concepts = await SnomedCtr.getConcepts(sctids);
        return res.json(concepts);
    } catch (e) {
        return next(e);
    }
});

/**
 * Devuelve las descripciones de un concepto
 */

router.get('/snomed/concepts/:sctid/descriptions', async (req, res, next) => {
    const sctid = req.params.sctid;
    try {
        const concept: any = await SnomedCtr.getConcept(sctid);
        return res.send(concept.descriptions);
    } catch (e) {
        return next(e);
    }
});

/**
 * Devuelve los padres de un concepto
 */

router.get('/snomed/concepts/:sctid/parents', async (req, res, next) => {
    const sctid = req.params.sctid;
    try {
        const concept: any = await SnomedCtr.getConcept(sctid);
        const relationships = SnomedCtr.filterRelationships(concept, { parent: true });
        return res.json(relationships);

    } catch (e) {
        return next(e);
    }
});

/**
 * Devuelve los hijos de un concepto
 *
 * @param {String} sctid Concetp ID
 * @param {Boolean} all True para devolver todo el arbol abajo del concept ID
 * @param {Boolean} leaf Devulve solo los descencientes hojas
 *
 */

router.get('/snomed/concepts/:sctid/childs', async (req, res, next) => {
    const sctid = req.params.sctid;
    const all = req.query.all || false;
    const leaf = req.query.leaf || false;
    try {
        const childs: any = await SnomedCtr.getChildren(sctid, { all, leaf });
        return res.json(childs);

    } catch (e) {
        return next(e);
    }
});

/**
 * Busqueda de concepto snomed
 * Filtro por texto, reference set, semanticTag, Atributos, Hojas.
 * Skip y limit
 */
router.get('/snomed/search', async (req, res, next) => {
    if (!req.query.search && !req.query.refsetId && req.query.search !== '') {
        return next('Debe ingresar un parámetro de búsqueda');
    }

    const search = req.query.search;

    // Filtros básicos
    const conditions = {
        languageCode: 'spanish',
        conceptActive: true,
        active: true
    };

    // Filtramos por semanticTag
    if (req.query.semanticTag) {
        conditions['$or'] = req.query.semanticTag.map((i) => { return { semanticTag: i }; });
    }

    // Filtro por referen set
    if (req.query.refsetId) {
        conditions['refsetIds'] = req.query.refsetId;
    }

    if (isNaN(search)) {
        // Busca por palabras
        conditions['$and'] = [];
        const words = search.split(' ');
        words.forEach((word) => {
            // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
            word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
            const expWord = '^' + utils.removeDiacritics(word) + '.*';
            // agregamos la palabra a la condicion
            conditions['$and'].push({ words: { $regex: expWord } });
        });
    } else {
        // Busca por conceptId
        conditions['conceptId'] = search.toString();
    }

    let lookUp = null;
    const secondMatch = { $match: {} };
    const attributes = req.query.attributes;
    const leaf = req.query.leaf;
    if (attributes || leaf) {
        lookUp = {
            $lookup: {
                from: configPrivate.snomed.dbVersion,
                localField: 'conceptId',
                foreignField: 'conceptId',
                as: 'concept'
            }
        };
    }

    // Filtros por atributos
    if (attributes) {
        const conds = [];
        for (const elem of attributes) {
            const filters = {
                active: true
            };
            if (elem.sctid) {
                if (!elem.descendientes) {
                    filters['destination.conceptId'] = elem.sctid;
                } else {
                    filters['destination.conceptId'] = {
                        $in: await SnomedCtr.getChildren(elem.sctid, { all: true, completed: false })
                    };
                }
            }
            if (elem.typeid) {
                filters['type.conceptId'] = elem.typeid;
            }
            const cond = {
                'concept.relationships': {
                    $elemMatch: filters
                }
            };
            conds.push(cond);
        }
        secondMatch['$match']['$and'] = conds;
    }

    // Filtrams solo las hojas.
    if (leaf) {
        secondMatch['$match']['concept.isLeafInferred'] = true;
        secondMatch['$match']['concept.isLeafStated'] = true;
    }

    const pipeline = [
        { $match: conditions },

        ...(lookUp ? [lookUp, secondMatch] : []),
        // ...(secondMatch ? [lookUp, secondMatch] : []),

        { $sort: { term: 1 } },
        { $skip: parseInt(req.query.skip, 0) || 0 },
        { $limit: parseInt(req.query.limit, 0) || 1000 },
        {
            $project: {
                conceptId: 1,
                term: 1,
                fsn: 1,
                semanticTag: 1,
                refsetIds: 1,
                aEq: { $eq: ['$fsn', '$term'] }
            }
        },
        { $match: { aEq: false } }
    ];

    const result = await toArray(TextIndexModel.aggregate(pipeline).cursor({}).exec());
    res.send(result);

});

router.get('/snomed/expression', async (req, res, next) => {
    let options = {
        form: req.query.type || 'stated'
    };

    let expression = req.query.expression;
    let query = makeMongoQuery(expression, options);
    let project = { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 };
    let languageCode = req.query.languageCode ? req.query.languageCode : 'es';

    if (req.query.field && req.query.field === 'term') {

        let conditions = [];
        let words = req.query.words.split(' ');
        words.forEach((word) => {
            // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
            word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
            let expWord = '^' + utils.removeDiacritics(word) + '.*';
            // agregamos la palabra a la condicion
            conditions.push({ 'descriptions.words': { $regex: expWord } });
        });

        const pipeline = [
            {
                $match: query,
            },
            {
                $project: { ...project, descriptions: 1 }
            },
            {
                $unwind: '$descriptions'
            },
            {
                $match: {
                    'descriptions.languageCode': languageCode,
                    $and: conditions
                }
            },
            {
                $project: {
                    fsn: '$fullySpecifiedName',
                    term: '$descriptions.term',
                    conceptId: '$conceptId',
                    semanticTag: '$semtag'
                }
            }
        ];

        res.json(await toArray(SnomedModel.aggregate(pipeline).cursor({}).exec()));

    } else {

        SnomedModel.find(query, { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 }).sort({ fullySpecifiedName: 1 }).then((docs: any[]) => {
            const response = docs.map((item) => {
                const term = item.fullySpecifiedName.substring(0, item.fullySpecifiedName.indexOf('(') - 1);
                return {
                    fsn: item.fullySpecifiedName,
                    term,
                    conceptId: item.conceptId,
                    semanticTag: item.semtag
                };
            });
            return res.json(response);
        }).catch(next);
    }
});
export = router;
