import * as express from 'express';
import * as facturacionCtrl from '../controllers/facturacionCtrl';
import * as organizacion from '../../../core/tm/schemas/organizacion';
import * as agendaSchema from '../../turnos/schemas/agenda';
import * as agenda from '../../turnos/controller/agenda';
import * as configPrivate from '../../../config.private';
import { configuracionPrestaciones } from '../schemas/configuracionPrestacion';
import { model as prestacion } from '../../rup/schemas/prestacion';
import { Auth } from './../../../auth/auth.class';
import { toArray } from '../../../utils/utils';

let router = express.Router();

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
        organizacion.model.findById( {_id: req.params.id}, function (err, _organizacion: any) {
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
        configuracionPrestaciones.findOne({'snomed.conceptId': req.params.id}, function (err, result: any) {
            if (err) {
                return next(err);
            }
            res.json(result);
        });
    } catch (error) {
        res.end(error);
    }
});


router.get('/cambioEstado/:id',  function (req, res, next) {
    try {
        agendaSchema.find({'bloques.turnos._id': req.params.id
        }).exec(function (err, data: any) {
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


router.get('/sinTurno/:conceptId', async function (req, res, next) {
    try {
        prestacion.aggregate([
            {
                $match: {
                    'solicitud.tipoPrestacion.conceptId': req.params.conceptId,
                    'solicitud.turno': { $exists: false },
                }
            }
        ]).cursor({}).exec((err, data: any) => {
            if (err) {
                return next(err);
            }
            res.json(toArray(data));
        });
    } catch (error) {
        res.end(error);
    }
});

export = router;
