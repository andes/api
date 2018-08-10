import * as express from 'express';
import * as facturacionCtrl from '../controllers/facturacionCtrl';
import * as organizacion from '../../../core/tm/schemas/organizacion';
import * as agendaSchema from '../../turnos/schemas/agenda';
import * as agenda from '../../turnos/controller/agenda';
import * as configPrivate from '../../../config.private';
import * as facturacionAutomaticaModel from './../schemas/configFacturacionAutomatica';
import { model as prestacion } from '../../rup/schemas/prestacion';
import { Auth } from './../../../auth/auth.class';
import { toArray } from '../../../utils/utils';
import * as mongoose from 'mongoose';
import { prestacionesAFacturarModel } from '../schemas/prestacionesAFacturar';
import { getPrestacionesAfacturar } from '../controllers/facturacionCtrl';
let router = express.Router();

router.get('/prueba', async function (req, res, next) {
    await facturacionCtrl.getPrestacionesAfacturar();
});

router.get('/facturacion/turnos', async function (req, res, next) {
    try {
        let result = await facturacionCtrl.getTurnosFacturacionPendiente();
        res.json(result);
    } catch (error) {
        res.end(error);
    }
});

router.get('/efector/:id', async function (req, res, next) {
    try {
        organizacion.model.findById({ _id: req.params.id }, function (err, _organizacion: any) {
            if (err) {
                return next(err);
            }

            res.json(_organizacion ? _organizacion.codigo.cuie : null);
        });
    } catch (error) {
        res.end(error);
    }
});

router.get('/configuracionPrestacion/:id', async function (req, res, next) {
    try {
        facturacionAutomaticaModel.findOne({ 'snomed.conceptId': req.params.id }, function (err, result: any) {
            if (err) {
                return next(err);
            }
            res.json(result);
        });
    } catch (error) {
        res.end(error);
    }
});


router.post('/cambioEstado/:id', function (req, res, next) {
    try {
        agendaSchema.find({
            'bloques.turnos._id': req.params.id
        }).exec(function (err, data: any) {
            let indexs = agenda.getPosition(null, data[0], req.params.id);
            let turno = data[0].bloques[indexs.indexBloque].turnos[indexs.indexTurno];
            turno.estadoFacturacion = 'facturado';

            Auth.audit(data[0], configPrivate.userScheduler);
            data[0].save((err2, result) => {
                if (err2) {
                    return next(err2);
                }
                console.log(result);
                res.json(result);
            });
        });
    } catch (error) {
        res.end(error);
    }
});



router.get('/cambioEstadoAgenda/:id', function (req, res, next) {
    try {
        agendaSchema.find({
            '_id': req.params.id, 'bloques.turnos.estadoFacturacion': 'sinFacturar'
        }).exec(function (err, data: any) {
            if (data.length === 0) {
                agendaSchema.findByIdAndUpdate(req.params.id, { estadoFacturacion: 'facturado' }, { new: true }, function (err, agenda) {
                    res.json(agenda);
                });
            }
            // let indexs = agenda.getPosition(null, data[0], req.params.id);
            // let turno = data[0].bloques[indexs.indexBloque].turnos[indexs.indexTurno];
            // turno.estadoFacturacion = 'facturado';

            res.send(data);
        });
    } catch (error) {
        res.end(error);
    }
});

router.get('/prestacionPorTurno/:id', (req, res, next) => {
    try {
        prestacion.find({
            'solicitud.turno': mongoose.Types.ObjectId(req.params.id)
        }).exec(function (err, data: any) {
            console.log(data);

            res.json(data[0]);
        });
    } catch (error) {
        res.end(error);
    }
});



router.post('/cambioEstadoPrestaciones/:id', function (req, res, next) {
    console.log(req.params);
    try {
        prestacion.find({
            '_id': mongoose.Types.ObjectId(req.params.id)
        }).exec(function (err, data: any) {
            data[0].estadoFacturacion = 'facturado';

            Auth.audit(data[0], configPrivate.userScheduler);
            data[0].save((err2, result) => {
                if (err2) {
                    return next(err2);
                }
                // res.json(result);
            });
            // res.send(data);
        });
    } catch (error) {
        res.end(error);
    }
});


router.get('/sinTurno', async function (req, res, next) {
    try {
        let prestaciones = await getPrestacionesAfacturar();
        console.log(prestaciones);
        let match = {
            $match: {
                'solicitud.tipoPrestacion.conceptId':  { $in: prestaciones },
                'solicitud.turno': { $exists: false },
                'estadoFacturacion': 'sinFacturar'
            }
        };

        let data = await toArray(prestacion.aggregate([
            match,
        ]).cursor({})
            .exec());

        res.json(data);
    } catch (error) {
        res.end(error);
    }
});


router.get('/prestacionesConTurno/:id', async function (req, res, next) {
    prestacion.find({
        'solicitud.turno': mongoose.Types.ObjectId(req.params.id)
    }).exec(function (err, data: any) {
        res.json(data);

    });

});

export = router;
