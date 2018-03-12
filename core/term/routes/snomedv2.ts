import * as express from 'express';
import { textIndexModel, snomedModel, textIndexSchema } from '../schemas/snomed';
import * as utils from '../../../utils/utils';
import * as snomedCtr from '../controller/snomedCtr';
import * as configPrivate from './../../../config.private';
import * as debug from 'debug';
import { makeMongoQuery } from '../controller/grammar/parser';
import { toArray } from '../../../utils/utils';

let log = debug('SNOMED');
let router = express.Router();


/**
 * Devuelve un concepto Entero
 */

router.get('/snomed/concepts/:sctid', async function (req, res, next) {
    let sctid = req.params.sctid;
    try {
        let concept = await snomedCtr.getConcept(sctid);
        return res.json(concept);
    } catch (e) {
        return next(e);
    }
});

/**
 * Devuelve las descripciones de un concepto
 */

router.get('/snomed/concepts/:sctid/descriptions', async function (req, res, next) {
    let sctid = req.params.sctid;
    try {
        let concept: any = await snomedCtr.getConcept(sctid);
        return res.send(concept.descriptions);
    } catch (e) {
        return next(e);
    }
});

/**
 * Devuelve los padres de un concepto
 */

router.get('/snomed/concepts/:sctid/parents', async function (req, res, next) {
    let sctid = req.params.sctid;
    try {
        let result = [];
        let concept: any = await snomedCtr.getConcept(sctid);
        let relationships = snomedCtr.filterRelationships(concept, { parent: true });
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
 */

router.get('/snomed/concepts/:sctid/childs', async function (req, res, next) {
    let sctid = req.params.sctid;
    let all = req.query.all || false;
    let leaf = req.query.leaf || false;
    try {
        let result = [];
        let childs: any = await snomedCtr.getChilds(sctid, { all, leaf });
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
router.get('/snomed/search', async function (req, res, next) {
    if (!req.query.search && !req.query.refsetId && req.query.search !== '') {
        return next('Debe ingresar un parámetro de búsqueda');
    }

    let search = req.query.search;

    // Filtros básicos
    let conditions = {
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
        let words = search.split(' ');
        words.forEach(function (word) {
            // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
            word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
            let expWord = '^' + utils.removeDiacritics(word) + '.*';
            // agregamos la palabra a la condicion
            conditions['$and'].push({ 'words': { '$regex': expWord } });
        });
    } else {
        // Busca por conceptId
        conditions['conceptId'] = search.toString();
    }

    let lookUp = null;
    let secondMatch = { $match: {} };
    let attributes = req.query.attributes;
    let leaf = req.query.leaf;
    if (attributes || leaf) {
        lookUp = {
            '$lookup': {
                from: configPrivate.snomed.dbVersion,
                localField: 'conceptId',
                foreignField: 'conceptId',
                as: 'concept'
            }
        };
    }

    // Filtros por atributos
    if (attributes) {
        let conds = [];
        for (let elem of attributes) {
            let filters = {
                active: true
            };
            if (elem.sctid) {
                if (!elem.descendientes) {
                    filters['destination.conceptId'] = elem.sctid;
                } else {
                    filters['destination.conceptId'] = {
                        $in: await snomedCtr.getChilds(elem.sctid, { all: true, completed: false })
                    };
                }
            }
            if (elem.typeid) {
                filters['type.conceptId'] = elem.typeid;
            }
            let cond = {
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

    let pipeline = [
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
                aEq: { '$eq': ['$fsn', '$term'] }
            }
        },
        { $match: { aEq: false } }
    ];

    let result = await toArray(textIndexModel.aggregate(pipeline).cursor({}).exec());
    res.send(result);

});

router.get('/snomed/expression', async function (req, res, next) {
    let expression = req.query.expression;
    let query = makeMongoQuery(expression);
    snomedModel.find(query, { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 }).sort({ fullySpecifiedName: 1 }).then((docs: any[]) => {
        let response = docs.map((item) => {
            let term = item.fullySpecifiedName.substring(0, item.fullySpecifiedName.indexOf('(') - 1);
            return {
                fsn: item.fullySpecifiedName,
                term: term,
                conceptId: item.conceptId,
                semanticTag: item.semtag
            };
        });
        return res.json(response);
    }).catch(next);
});

export = router;
