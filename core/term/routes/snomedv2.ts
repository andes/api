import * as express from 'express';
import { SnomedCtr } from '../controller/snomed.controller';

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
    const sctids = Array.isArray(req.query.sctids as any) ? req.query.sctids as any : [req.query.sctids as any];
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
 * [DEPRECATED]
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
 * [DEPRECATED] No se usa desde la app
 */

router.get('/snomed/concepts/:sctid/childs', async (req, res, next) => {
    const sctid = req.params.sctid as any;
    const all = req.query.all as any || false;
    const leaf = req.query.leaf as any || false;
    try {
        const childs: any = await SnomedCtr.getChildren(sctid, { all, leaf });
        return res.json(childs);

    } catch (e) {
        return next(e);
    }
});

router.get('/snomed/expression', async (req, res, next) => {
    const form = req.query.type as any || 'stated';
    const words = req.query.words as any;
    const expression = req.query.expression as any;
    const languageCode = req.query.languageCode as any ? req.query.languageCode as any : 'es';

    const concepts = await SnomedCtr.getConceptByExpression(expression, words, form, languageCode);
    return res.json(concepts);
});

router.get('/snomed/relationships', async (req, res, next) => {
    const sctids = req.query.expression as any;
    const types = req.query.type as any;
    try {
        const concepts = await SnomedCtr.getValuesByRelationships(sctids, types);
        return res.json(concepts);
    } catch (e) {
        return next(e);
    }
});

export = router;
