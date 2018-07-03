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
        if (req.query.snomed) {
            query = configuracionPrestacion.configuracionPrestacionModel.find({ 'snomed.conceptId': req.query.snomed });
        }
        if (req.query.organizacion) {
            query = configuracionPrestacion.configuracionPrestacionModel.find({ 'organizaciones._id': req.query.organizacion });
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
    console.log('entro: ' + req);
    if (req.query.idOrganizacion && req.query.conceptIdSnomed) {
        let query;
        console.log('esp: ' + req.query.idEspecialidad);
        if (req.query.idEspecialidad) {

            query = configuracionPrestacion.configuracionPrestacionModel.update(
                { 'organizaciones._id': req.query.idOrganizacion, 'snomed.conceptId': req.query.conceptIdSnomed, 'organizaciones.idEspecialidad': req.query.idEspecialidad }
                , { $pull: { 'organizaciones': { '_id': req.query.idOrganizacion } } });

        }
        console.log('cod: ' + req.query.codigo);
        if (req.query.codigo) {

            query = configuracionPrestacion.configuracionPrestacionModel.update(
                { 'organizaciones._id': req.query.idOrganizacion, 'snomed.conceptId': req.query.conceptIdSnomed, 'organizaciones.codigo': req.query.codigo }
                , { $pull: { 'organizaciones': { '_id': req.query.idOrganizacion } } });
        }
        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.send({ status: 'ok' });
        });

    } else {
        res.status(404).send('Error ejecutando el método');
    }
});

/**
Inserta un 'mapeo' de tipoPrestacion - Especialidad - Organicación.

@param {any} organizacion
@param {any} conceptSnomed
@param {any} prestacionLegacy
*/
router.post('/configuracionPrestaciones', function (req, res, next) {
    console.log(req.query.organizacion);
    if (req.query.organizacion && req.query.conceptSnomed && req.query.prestacionLegacy) {
        let idSnomed = req.query.conceptSnomed.conceptId;
        let codigoPrestacion = req.query.prestacionLegacy.codigo;
        let existeConcepto = (configuracionPrestacion.configuracionPrestacionModel.find({ 'snomed.conceptId': idSnomed }));

        // Se verifica que no esixta un mapeo correspondiente a este concepto
        if (existeConcepto) {
            let result = configuracionPrestacion.configuracionPrestacionModel.find(
                { 'organizaciones._id': req.query.organizacion.id, 'snomed.conceptId': idSnomed, 'organizaciones.codigo': codigoPrestacion }).exec();

            if (result) {
                return next({ error: 'Mapeo existente' });
            } else {
                configuracionPrestacion.configuracionPrestacionModel.update({ 'organizaciones._id': req.query.organizacion.id }, { $push: req.query.prestacionLegacy }, function (err, resultado) {
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
                    _id: new mongoose.Types.ObjectId(req.query.organizacion.id),
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
