import * as express from 'express';
import * as cie10 from '../schemas/cie10';
import * as utils from '../../../utils/utils';
import { defaultLimit, maxLimit } from './../../../config';

const router = express.Router();

router.get('/cie10', (req, res, next) => {
    let query;
    const conditions = {};
    let termino: String = '';
    // conditions['$and'] = [];
    conditions['$or'] = [];

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

    query = cie10.model.find(conditions);
    let filtro = '';
    if (req.query.codigoDesde && req.query.codigoHasta) {
        query.where('codigo').gt(req.query.codigoDesde);
        query.where('codigo').lt(req.query.codigoHasta);
    }

    const skip = parseInt(req.query.skip || 0, 10);
    const limit = Math.min(parseInt(req.query.limit || defaultLimit, 15), maxLimit);
    query.skip(skip);
    query.limit(limit);
    query.exec((err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
