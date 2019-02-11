import * as express from 'express';
import { model as Organizacion } from '../../../../core/tm/schemas/organizacion';
import { model as Prestacion } from '../../../../modules/rup/schemas/prestacion';

import { getUltimoNumeroProtocolo,
    getResultadosAnteriores,
    getEjecucionesCobasC311,
    enviarAutoanalizador,
    getProtocoloById,
    getProtocoloByNumero,
    getProtocolos
} from '../controller/protocolo';
import { Types } from 'mongoose';
import { parse } from 'querystring';


let router = express.Router();

router.get('/protocolos/', async (req, res, next) => {
    try {
        let data = await getProtocolos(req.query);
        if (data) {
            res.json(data);
        } else {
            return next(404);
        }
    } catch (err) {
        return next(err);
    }
});

router.get('/protocolos/generarNumero/', async (req, res, next) => {
    let idEfector = Types.ObjectId(req.query.idEfector);
    let ultimoNumeroProtocolo = await getUltimoNumeroProtocolo(idEfector);
    let anio = new Date().getFullYear().toString().substr(-2);
    let prefijo;
    try {
        Organizacion.findOne(idEfector).then((organizacion: any) => {
            prefijo = organizacion.prefijo;
            ultimoNumeroProtocolo++;
            let nuevoNumeroProtocolo = {
                numeroCompleto: ultimoNumeroProtocolo + '-' + prefijo + anio,
                numero: ultimoNumeroProtocolo
            };
            res.json(nuevoNumeroProtocolo);
        });
    } catch (e) {
        res.json(e);
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
            let data = await getProtocoloByNumero(req.params.numero);
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
            let data = await getProtocoloById(req.params.id);
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
    } catch (error) {
        // console.log('error /protocolos/ejecuciones/registros/:id :', error);
    }
});

router.patch('/protocolos/ejecuciones/registros', async (req, res, next) => {
    // console.log('req.params', req.body.registros);
    let registros = req.body.registros;
    // console.log(req.body)
    let promises = registros.map((ejecucion: any) => {
        return Prestacion.updateOne(
            {
                // _id: ejecucion._id,
                // 'ejecucion.registros.concepto.conceptId': ejecucion.conceptId
                'ejecucion.registros._id': Types.ObjectId(ejecucion._id)
            },
            {
                $set: {
                    'ejecucion.registros.$.valor': ejecucion.valor
                }
                // ,
                // $push: {
                //     'ejecucion.registros.$.valor.estados': ejecucion.estado
                // }
            },
            (err, data: any) => {
                if (err) {
                    return next(err);
                }
            }
        );
    });
    res.json(await Promise.all(promises));
});

export = router;
