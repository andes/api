import * as express from 'express';
import * as configuracionPrestacion from '../schemas/configuracionPrestacion';
import * as mongoose from 'mongoose';

let router = express.Router();

router.get('/configuracionPrestaciones/:id*?', function (req, res, next) {
    // Agregar seguridad!!
    // if (!Auth.check(req, 'string')) {
    //     return next(403);
    // }

    if (req.params.id) {
        configuracionPrestacion.configuracionPrestacionModel.findById(req.params.id
            , function (err, data) {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
    } else {
        let query;
        query = configuracionPrestacion.configuracionPrestacionModel.find({});
        if (req.query.snomed) {
            query.where('snomed.conceptId').equals(req.query.snomed);
        }
        if (req.query.organizacion) {
            query.where('organizaciones._id').equals(req.query.organizaciones);
        }
        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

/**
Elimina un 'mapeo' (Elemento del arreglo 'organizaciones') de tipoPrestacion - Especialidad - Organicación.

@param {any} idOrganizacion (string)
@param {any} conceptIdSnomed (string)
@param {any} codigoEspecialidad (int)
*/

router.put('/configuracionPrestaciones', function (req, res, next) {

    if (req.query.idOrganizacion && req.query.conceptIdSnomed && req.query.codigoEspecialidad) {

        configuracionPrestacion.configuracionPrestacionModel.update(
            { 'organizaciones._id': req.query.idOrganizacion, 'snomed.conceptId': req.query.conceptIdSnomed, 'organizaciones.codigo': req.query.codigoEspecialidad }
            , { $pull: { 'organizaciones': { '_id': req.query.idOrganizacion } } }, function (err, resultado) {

                if (err) {
                    return next(err);
                } else {
                    res.send({ status: 'ok' });
                }

            });
    } else {
        res.status(404).send('Error ejecutando el método');
    }
});

/**
Inserta un 'mapeo' de tipoPrestacion - Especialidad - Organicación.

@param {any} organizacion (id)
@param {any} conceptSnomed (dto de concepto turneable)
@param {any} prestacionLegacy
*/
router.post('/configuracionPrestaciones', function (req, res, next) {

    if (req.query.organizacion && req.query.conceptSnomed && req.query.prestacionLegacy) {
        let idSnomed = req.query.conceptSnomed.conceptId;
        let codigoPrestacion = req.query.prestacionLegacy.codigo;
        let coincidencias = false;
        let organizacionesAux = [];     // Arreglo de organizaciones en las cuales se insertará el mapeo.

        let existeConcepto = (configuracionPrestacion.configuracionPrestacionModel.find({ 'snomed.conceptId': idSnomed }));

        if (existeConcepto) {
            let result = configuracionPrestacion.configuracionPrestacionModel.find(
                { 'organizaciones._id': req.query.organizacion, 'snomed.conceptId': idSnomed, 'organizaciones.codigo': codigoPrestacion }).exec();

            if (result) {
                return next({ error: 'Mapeo existente' });
            } else {
                configuracionPrestacion.configuracionPrestacionModel.update({ 'organizaciones._id': req.query.organizacion }, { $push: req.query.prestacionLegacy }, function (err, resultado) {
                    if (err) {
                        return next(err);
                    } else {
                        res.send({ status: 'ok' });
                    }
                });
            }
        } else {
            let newConfigPres = {
                'snomed': req.query.conceptSnomed,
                'organizaciones': [{
                    _id: new mongoose.Types.ObjectId(req.query.organizacion),
                    'idEspecialidad': req.query.prestacionLegacy.idEspecialidad,
                    'nombreEspecialidad': req.query.prestacionLegacy.nombreEspecialidad,
                    'codigo': req.query.prestacionLegacy.codigo
                }]
            };

            try {
                configuracionPrestacion.configuracionPrestacionModel.create(newConfigPres);
            } catch (ex) {
                return next(ex);
            }
        }
    } else {
        res.status(404).send('Error ejecutando el método');
    }
});

export = router;
