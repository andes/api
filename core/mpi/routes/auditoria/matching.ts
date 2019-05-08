import * as express from 'express';
import { paciente } from '../../schemas/paciente';
import * as servicioSisa from '../../../../utils/servicioSisa';
import { Auth } from '../../../../auth/auth.class';

const router = express.Router();

// [Deprecated] : Rutas no utlilizadas

router.get('/matching/:id*?', (req, res, next) => {
    if (!Auth.check(req, 'mpi:matching:get')) {
        return next(403);
    }
    if (req.params.id) {
        paciente.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = paciente.find({
            matchSisa: {
                $gt: 0.7,
                $lte: 0.99
            },
            estado: 'temporal'
        });
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

router.patch('/matching/:id', (req, res, next) => {
    if (!Auth.check(req, 'mpi:matching:patch')) {
        return next(403);
    }
    paciente.findById(req.params.id, (_err, data) => {
        if (req.body.op === 'validarSisa') {
            const pacienteAux = data;
            const pacientesRes = [];
            servicioSisa.matchSisa(pacienteAux)
                .then(resultado => {
                    pacientesRes.push(resultado);
                    let arrPacValidados;
                    arrPacValidados = pacientesRes;
                    const arrPacientesSisa = [];
                    arrPacValidados.forEach((pacVal) => {
                        let datoPac;
                        datoPac = pacVal.matcheos.datosPaciente;
                        if (datoPac) {
                            arrPacientesSisa.push(datoPac);
                        }
                    });
                    res.send(arrPacientesSisa);
                })
                .catch(error => {
                    next(error);
                });
        }
    });
});

router.put('/matching/:id', (req, res, next) => {
    if (!Auth.check(req, 'mpi:matching:put')) {
        return next(403);
    }
    paciente.findByIdAndUpdate(req.params.id, req.body, { new: true }, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
