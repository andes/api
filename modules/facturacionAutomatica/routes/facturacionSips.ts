import * as express from 'express';
import * as facturacionCtrl from '../controllers/facturacionCtrl';
import * as organizacion from '../../../core/tm/schemas/organizacion';
import * as agendaSchema from '../../turnos/schemas/agenda';
import * as agenda from '../../turnos/controller/agenda';
import * as configPrivate from '../../../config.private';
import * as facturacionAutomaticaModel from './../schemas/configFacturacionAutomatica';
import { model as prestacion } from '../../rup/schemas/prestacion';
import { Auth } from './../../../auth/auth.class';
import * as mongoose from 'mongoose';
import { getPrestacionesAfacturar } from '../controllers/facturacionCtrl';
let router = express.Router();

router.get('/prueba', async (req, res, next) => {
    await facturacionCtrl.getPrestacionesAfacturar();
});

router.get('/facturacion/turnos', async (req, res, next) => {
    try {
        let result = await facturacionCtrl.getTurnosFacturacionPendiente();
        res.json(result);
    } catch (error) {
        res.end(error);
    }
});

router.get('/efector/:id', async (req, res, next) => {
    try {
        organizacion.model.findById({ _id: req.params.id }, (err, _organizacion: any) => {
            if (err) {
                return next(err);
            }

            res.json(_organizacion ? _organizacion.codigo.cuie : null);
        });
    } catch (error) {
        res.end(error);
    }
});

router.get('/configuracionPrestacion/:id', async (req, res, next) => {
    try {
        facturacionAutomaticaModel.findOne({ 'snomed.conceptId': req.params.id }, (err, result: any) => {
            if (err) {
                return next(err);
            }
            res.json(result);
        });
    } catch (error) {
        res.end(error);
    }
});


router.post('/cambioEstado/:id', (req, res, next) => {
    try {
        agendaSchema.find({
            'bloques.turnos._id': req.params.id
        }).exec( (err, data: any) => {
            let indexs = agenda.getPosition(null, data[0], req.params.id);
            let turno = data[0].bloques[indexs.indexBloque].turnos[indexs.indexTurno];
            turno.estadoFacturacion = 'facturado';

            Auth.audit(data[0], configPrivate.userScheduler);
            data[0].save((err2, result) => {
                if (err2) {
                    return next(err2);
                }
                res.json(result);
            });
        });
    } catch (error) {
        res.end(error);
    }
});


router.get('/cambioEstadoAgenda/:id', (req, res, next) => {
    try {
        agendaSchema.find({
            _id: req.params.id, 'bloques.turnos.estadoFacturacion': 'sinFacturar'
        }).exec((err, data: any) => {
            if (data.length === 0) {
                agendaSchema.findByIdAndUpdate(req.params.id, { estadoFacturacion: 'facturado' }, { new: true }, (err, agenda) => {
                    res.json(agenda);
                });
            }

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
        }).exec((err, data: any) => {
            res.json(data[0]);
        });
    } catch (error) {
        res.end(error);
    }
});


router.post('/cambioEstadoPrestaciones/:id', (req, res, next) => {
    try {
        prestacion.find({
            _id: mongoose.Types.ObjectId(req.params.id)
        }).exec((err, data: any) => {
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


router.get('/sinTurno', async (req, res, next) => {
    try {


        let prestaciones = await getPrestacionesAfacturar();
        const estado = 'validada';
        prestacion.find({
            'solicitud.tipoPrestacion.conceptId': { $in: prestaciones },
            'solicitud.turno': { $exists: false },
            estadoFacturacion: 'sinFacturar',
            $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + estado + '\"'
        }, (err, prestaciones) => {
            res.json(prestaciones);
        });
    } catch (error) {
        res.end(error);
    }
});


router.get('/prestacionesConTurno/:id', async  (req, res, next)  => {
    prestacion.find({
        'solicitud.turno': mongoose.Types.ObjectId(req.params.id)
    }).exec((err, data: any)  => {
        res.json(data);

    });

});

export = router;
