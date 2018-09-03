import * as express from 'express';
import * as configuracionPrestacion from '../schemas/configuracionPrestacion';
import * as mongoose from 'mongoose';

const router = express.Router();

router.get('/configuracionPrestaciones/:id*?', (req, res, next) => {
    // Agregar seguridad!!
    // if (!Auth.check(req, 'string')) {
    //     return next(403);
    // }

    if (req.params.id) {
        configuracionPrestacion.configuracionPrestacionModel.findById(req.params.id
            , (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
    } else {
        let query = configuracionPrestacion.configuracionPrestacionModel.find({});
        if (req.query.snomed) {
            query.where({ 'snomed.conceptId': req.query.snomed });
        }
        if (req.query.organizacion) {
            query.where({ 'organizaciones._id': req.query.organizacion });
        }

        query.exec((err, data) => {
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

router.put('/configuracionPrestaciones', (req, res, next) => {
    if (req.body.idTipoPrestacion && req.body.idOrganizacion) {
        // busca por especialidad
        configuracionPrestacion.configuracionPrestacionModel.update(
            { _id: req.body.idTipoPrestacion }, { $pull: { organizaciones: { _id: req.body.idOrganizacion } } }, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
    } else {
        res.status(404).send('Error, parámetros incorrectos.');
    }
});

/**
Inserta un 'mapeo' de tipoPrestacion - Especialidad - Organicación.

@param {any} organizacion
@param {any} conceptSnomed
@param {any} prestacionLegacy
*/
router.post('/configuracionPrestaciones', async (req, res, next) => {
    if (req.body.organizacion && req.body.conceptSnomed && req.body.prestacionLegacy) {
        const idSnomed = req.body.conceptSnomed.conceptId;
        const existeTipoPrestacion = await configuracionPrestacion.configuracionPrestacionModel.findOne({ 'snomed.conceptId': idSnomed });

        if (existeTipoPrestacion) {
            const existeOrganizacion = await configuracionPrestacion.configuracionPrestacionModel.findOne(
                { 'snomed.conceptId': idSnomed, 'organizaciones._id': req.body.organizacion.id });

            if (existeOrganizacion) {
                return next('Este concepto ya se encuentra mapeado');
            } else {
                const newOrganizacion = [{
                    _id: new mongoose.Types.ObjectId(req.body.organizacion.id),
                    idEspecialidad: req.body.prestacionLegacy.idEspecialidad,
                    nombreEspecialidad: req.body.prestacionLegacy.nombreEspecialidad,
                    codigo: req.body.prestacionLegacy.codigo
                }];
                configuracionPrestacion.configuracionPrestacionModel.update({ 'snomed.conceptId': idSnomed }, { $push: { organizaciones: newOrganizacion } }, (err, resultado) => {
                    if (err) {
                        return next(err);
                    } else {
                        res.json(resultado);
                    }
                });
            }
        } else {
            // Se crea el objeto ConfiguracionPrestacion completo
            const newConfigPres = {
                snomed: req.body.conceptSnomed,
                organizaciones: [{
                    _id: new mongoose.Types.ObjectId(req.body.organizacion.id),
                    idEspecialidad: req.body.prestacionLegacy.idEspecialidad,
                    nombreEspecialidad: req.body.prestacionLegacy.nombreEspecialidad,
                    codigo: req.body.prestacionLegacy.codigo
                }]
            };
            configuracionPrestacion.configuracionPrestacionModel.create(newConfigPres, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
        }
    } else {
        res.status(404).send('Error, parámetros incorrectos.');
    }
});

export = router;
