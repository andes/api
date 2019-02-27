import { EventCore } from './../../../../packages/event-bus/index';
import { Auth } from './../../../../auth/auth.class';
import * as express from 'express';
import { model as Prestacion } from '../../../../modules/rup/schemas/prestacion';


import { getResultadosAnteriores,
    getEjecucionesCobasC311,
    enviarAutoanalizador,
    getProtocoloById,
    getProtocoloByNumero,
    getProtocolos,
    generarNumeroProtocolo,
    actualizarRegistrosEjecucion
} from '../controller/protocolo';
import { Types } from 'mongoose';


let router = express.Router();

router.post('/protocolos/', async (req, res, next) => {
    try {
        let numero = await generarNumeroProtocolo(req.body.solicitud.organizacion.id);
        req.body.solicitud.registros[0].valor.solicitudPrestacion.numeroProtocolo = numero;

        let data: any = new Prestacion(req.body);
        Auth.audit(data, req);
        data.save((err) => {
            if (err) {
                return next(err);
            }
            res.json(data);
            EventCore.emitAsync('rup:prestacion:create', data);
        });
    } catch (e) {
        return next(e);
    }
});

router.get('/protocolos/', async (req, res, next) => {
    try {
        let data: any = await getProtocolos(req.query);
        if (data) {
            res.json(data);
        } else {
            return next(404);
        }
    } catch (err) {
        return next(err);
    }
});

router.get('/practicas/resultadosAnteriores', async (req, res, next) => {
    let idPaciente = Types.ObjectId(req.query.idPaciente);
    let practicaConceptIds = Array.isArray(req.query.practicaConceptIds) ? req.query.practicaConceptIds : [req.query.practicaConceptIds];
    let resultadosAnteriores = await getResultadosAnteriores(idPaciente, practicaConceptIds);

    res.json(resultadosAnteriores);
});

router.get('/protocolos/cobasc311', async (req, res, next) => {
    // if (!Auth.check(req, 'laboratorio:analizador:*')) {
    //     return next(403);
    // }
    let practicasCobas = await getEjecucionesCobasC311();
    res.json(practicasCobas);
});

router.get('/protocolos/cobasc311/:id', async (req, res, next) => {
    Prestacion.findById(req.params.id, (err, data: any) => {
        if (err) {
            return next(err);
        }
        if (data) {
            res.json(data);
        }
    });
});

router.patch('/practicas/cobasc311/:id', async (req, res, next) => {
    try {
        Prestacion.updateOne(
            {
                _id: req.params.id,
                'ejecucion.registros.concepto.conceptId': req.body.conceptId
            },
            {
                $set: {
                    'ejecucion.registros.$.valor.resultado.valor': req.body.valor
                },
                $push: {
                    'ejecucion.registros.$.valor.estados': req.body.estados
                }
            },
            (err, data: any) => {
                if (err) {
                    return next(err);
                }
                return res.json(data);
            }
        );
    } catch (error) {
        // console.log('error Prestacion.updateOne:', error);
    }
});

router.post('/protocolos/autoanalizador', async (req, res, next) => {
    let numeroProtocolo = req.query.numeroProtocolo;
    enviarAutoanalizador(numeroProtocolo);
    res.json({});
});


router.get('/protocolos/numero/:numero', async (req, res, next) => {
    try {
        if (req.params.numero) {
            let data: any = await getProtocoloByNumero(req.params.numero);
            if (data) {
                res.json(data);
            } else {
                return next(404);
            }
        }
    } catch (err) {
        return next(err);
    }
});

router.get('/protocolos/:id', async (req, res, next) => {
    try {
        if (req.params.id) {
            let data: any = await getProtocoloById(req.params.id);
            if (data) {
                res.json(data);
            } else {
                return next(404);
            }
        }
    } catch (err) {
        return next(err);
    }
});

router.patch('/protocolos/ejecuciones/registros/:id', async (req, res, next) => {
    try {
        Prestacion.updateOne(
            {
                _id: req.params.id,
                'ejecucion.registros.concepto.conceptId': req.body.registros[0].conceptId
            },
            {
                $set: {
                    'ejecucion.registros.$.valor.resultado.valor': req.body.registros[0].valor
                },
                $push: {
                    'ejecucion.registros.$.valor.estados': req.body.registros[0].estado
                }
            },
            (err, data: any) => {
                if (err) {
                    return next(err);
                }
                return res.json(data);
            }
        );
    } catch (err) {
        return next(err);
    }
});

router.patch('/protocolos/ejecuciones/registros', async (req, res, next) => {
    try {
        res.json(await actualizarRegistrosEjecucion(req));
    } catch (e) {
        return next(e);
    }
});

export = router;
