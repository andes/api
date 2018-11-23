import * as express from 'express';
import * as mongoose from 'mongoose';
import { removeDiacritics } from '../../../utils/utils';
import { espacioFisico } from '../schemas/espacioFisico';
import { defaultLimit, maxLimit } from './../../../config';

const router = express.Router();

router.get('/espacioFisico/:_id*?', (req, res, next) => {
    if (req.params._id) {
        espacioFisico.findById(req.params._id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        // Trae todos
        const radix = 10;
        const skip: number = parseInt(req.query.skip || 0, radix);
        const limit: number = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);
        const query = espacioFisico.find({});
        // .skip(skip).limit(limit);
        const nombres = [];

        if (req.query.nombre) {

            let termino: String = '';
            // separamos todas las palabras y eliminamos caracteres extraños
            const words = String(req.query.nombre).split(' ');
            words.forEach((word) => {
                // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
                word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
                const expWord = removeDiacritics(word) + '.*';
                // conditions['$or'].push({ 'words': { '$regex': '(?i)' + word } });
                // agregamos la palabra al término de búsqueda
                termino = termino + expWord;
            });
            nombres.push({ nombre: RegExp('^.*' + termino + '.*$', 'i') });
            nombres.push({ 'sector.nombre': RegExp('^.*' + termino + '.*$', 'i') });
            nombres.push({ 'servicio.nombre': RegExp('^.*' + termino + '.*$', 'i') });
            nombres.push({ 'edificio.descripcion': RegExp('^.*' + termino + '.*$', 'i') });
            query.or(nombres);

        }

        if (req.query.descripcion) {
            query.where('descripcion').equals(RegExp('^.*' + req.query.descripcion + '.*$', 'i'));
        }

        if (req.query.sector) {
            query.where('sector.nombre').equals(RegExp('^.*' + req.query.sector + '.*$', 'i'));
        }

        if (req.query.edificio) {
            query.where('edificio.descripcion').equals(RegExp('^.*' + req.query.edificio + '.*$', 'i'));
        }

        if (req.query.servicio) {
            query.where('servicio.nombre').equals(RegExp('^.*' + req.query.servicio + '.*$', 'i'));
        }

        if (req.query.organizacion) {
            query.where('organizacion._id').equals(mongoose.Types.ObjectId(req.query.organizacion));
        }

        if (req.query.sinOrganizacion) {
            query.where('organizacion').exists(false);
        }

        if (req.query.equipamiento) {
            let items;
            if (Array.isArray(req.query.equipamiento)) {
                items = req.query.equipamiento.map((item) => RegExp('^.*' + item + '.*$', 'i'));
            } else {
                items = RegExp('^.*' + req.query.equipamiento + '.*$', 'i');
            }
            query.where('equipamiento.term').in(items);
        }

        if (req.query.limit) {
            query.limit(Number(req.query.limit));
        }

        // Trae sólo los espacios físicos activos
        if (req.query.activo) {
            query.where('activo').equals(true);
        }

        query.sort('nombre');

        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

router.get('/espacioFisico/:idOrganizacion', (req, res, next) => {

    espacioFisico.find(req.params.idOrganizacion, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });

});

router.post('/espacioFisico', (req, res, next) => {
    const newEspacioFisico = new espacioFisico(req.body);
    newEspacioFisico.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newEspacioFisico);
    });
});

router.put('/espacioFisico/:id', (req, res, next) => {
    espacioFisico.findByIdAndUpdate(req.params.id, req.body, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/espacioFisico/:id', (req, res, next) => {
    espacioFisico.findByIdAndRemove(req.params.id, (err, data) => {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

export = router;
