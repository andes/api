import * as express from 'express';
import * as cie10 from '../schemas/cie10';
import * as utils from '../../../utils/utils';
import { defaultLimit, maxLimit } from './../../../config';

let router = express.Router();

router.get('/cie10', function (req, res, next) {
    let query;
    let conditions = {};
    let termino: String = '';
    // conditions['$and'] = [];
    conditions['$or'] = [];
    // separamos todas las palabras y eliminamos caracteres extraños
    let words = String(req.query.nombre).split(' ');
    words.forEach(function (word) {
        // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
        word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
        let expWord = utils.removeDiacritics(word) + '.*';
        conditions['$or'].push({ 'words': { '$regex': '(?i)' + word } });
        // agregamos la palabra al término de búsqueda
        termino = termino + expWord;
    });

    conditions['$or'].push({ 'codigo': RegExp('^.*' + termino + '.*$', 'i') });
    conditions['$or'].push({ 'nombre': RegExp('^.*' + termino + '.*$', 'i') });
    conditions['$or'].push({ 'sinonimo': RegExp('^.*' + termino + '.*$', 'i') });
    query = cie10.model.find(conditions);
    let skip = parseInt(req.query.skip || 0, 10);
    let limit = Math.min(parseInt(req.query.limit || defaultLimit, 15), maxLimit);
    query.skip(skip);
    query.limit(limit);
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
