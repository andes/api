import * as express from 'express';
import * as cie10 from '../schemas/cie10';
import * as utils from '../../../utils/utils';
import { defaultLimit, maxLimit } from './../../../config';

const router = express.Router();

router.get('/cie10', async (req, res, next) => {
    let query;
    const conditions = {};
    let termino: String = '';
    // conditions['$and'] = [];
    conditions['$or'] = [];
    let whereConditions = {};


    // separamos todas las palabras y eliminamos caracteres extraños
    const words = String(req.query.nombre).split(' ');
    words.forEach((word) => {
        // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
        word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
        const expWord = utils.removeDiacritics(word) + '.*';
        // conditions['$or'].push({ 'words': { '$regex': '(?i)' + word } });
        // agregamos la palabra al término de búsqueda
        termino = termino + expWord;
    });
    conditions['$or'].push({ codigo: RegExp('^.*' + termino + '.*$', 'i') });
    conditions['$or'].push({ nombre: RegExp('^.*' + termino + '.*$', 'i') });
    conditions['$or'].push({ sinonimo: RegExp('^.*' + termino + '.*$', 'i') });

    if (req.query.filtroRango) {
        whereConditions['$and'] = [];
        let orRango = {};
        orRango['$or'] = [];
        let filtroRango = JSON.parse(req.query.filtroRango);
        for (let rango of filtroRango) {
            orRango['$or'].push({ codigo: { $gt: rango.desde, $lt: rango.hasta } });
        }
        whereConditions['$and'].push(conditions);
        whereConditions['$and'].push(orRango);
    } else {
        whereConditions = conditions;
    }
    query = cie10.model.find(whereConditions);
    const skip = parseInt(req.query.skip || 0, 10);
    const limit = Math.min(parseInt(req.query.limit || defaultLimit, 15), maxLimit);
    query.skip(skip);
    query.limit(limit);
    try {
        let codigoCie = await query.exec();
        res.json(codigoCie);
    } catch (err) {
        return next(err);
    }
});

export = router;
