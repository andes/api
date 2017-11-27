import * as express from 'express';
import { textIndexModel, snomedModel, textIndexSchema } from '../schemas/snomed';
import * as utils from '../../../utils/utils';
import * as snomedCtr from '../controller/snomedCtr';
import * as configPrivate from './../../../config.private';
import { lookup } from 'mime';
import * as debug from 'debug';
let log = debug('SNOMED');

let router = express.Router();

router.get('/snomed/concepts/:sctid', async function (req, res, next) {
    let sctid = req.params.sctid;
    try {
        let concept = await snomedCtr.getConcept(sctid);
        return res.json(concept);
    } catch (e) {
        return next(e);
    }
});

router.get('/snomed/concepts/:sctid/descriptions', async function (req, res, next) {
    let sctid = req.params.sctid;
    try {
        let concept: any = await snomedCtr.getConcept(sctid);
        return res.send(concept.descriptions);
    } catch (e) {
        return next(e);
    }
});

router.get('/snomed/concepts/:sctid/parents', async function (req, res, next) {
    let sctid = req.params.sctid;
    try {
        let result = [];
        let concept: any = await snomedCtr.getConcept(sctid);
        let relationships = snomedCtr.filterRelationships(concept);
        return res.json(relationships);

    } catch (e) {
        return next(e);
    }
});

router.get('/snomed/concepts/:sctid/childs', async function (req, res, next) {
    let sctid = req.params.sctid;
    try {
        let result = [];
        let childs: any = await snomedCtr.getChilds(sctid);
        return res.json(childs);

    } catch (e) {
        return next(e);
    }
});

router.get('/snomed/search', async function (req, res, next) {
    if (!req.query.search && !req.query.refsetId && req.query.search !== '') {
        return next('Debe ingresar un parámetro de búsqueda');
    }

    let search = req.query.search;

    let conditions = {
        languageCode: 'spanish',
        conceptActive: true,
        active: true
    };

    // Filtramos por semanticTag
    if (req.query.semanticTag) {
        conditions['$or'] = req.query.semanticTag.map((i) => { return { semanticTag: i }; });
    }

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
    if (attributes) {
        let conds = [];
        attributes.forEach(elem => {
            let filters = {
                active: true
            };
            if (elem.sctid) {
                filters['destination.conceptId'] = elem.sctid;
            }
            if (elem.typeid) {
                filters['type.conceptId'] = elem.typeid;
            }
            let cond = {
                'concept.relationships' :  {
                    $elemMatch: filters
                }
            };
            conds.push(cond);
        });
        secondMatch['$match']['$and'] = conds;
    }
    if (leaf) {
        secondMatch['$match']['concept.isLeafInferred'] = true;
        secondMatch['$match']['concept.isLeafStated'] = true;
    }

    let pipeline = [
        {$match: conditions},

        ...(lookUp ? [lookUp, secondMatch] : []),
        // ...(secondMatch ? [lookUp, secondMatch] : []),

        {$sort: { term: 1 }},
        {$skip: parseInt(req.query.skip, 0) || 0 },
        {$limit: parseInt(req.query.limit, 0) || 1000 },
        {$project: {
            conceptId: 1,
            term: 1,
            fsn: 1,
            semanticTag: 1,
            refsetIds: 1,
            aEq: {'$eq': ['$fsn', '$term']}
        }},
        {$match: { aEq: false }}
    ];
    // console.log(pipeline);

    textIndexModel.aggregate(pipeline, function (err, docs) {
        res.send(docs);
    });

});

export = router;
