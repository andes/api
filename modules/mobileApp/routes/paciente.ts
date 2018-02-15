import { pacienteApp } from '../schemas/pacienteApp';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import * as authController from '../controller/AuthController';
import * as express from 'express';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import { ElasticSync } from '../../../utils/elasticSync';
import { Logger } from '../../../utils/logService';
import * as debug from 'debug';
import * as controllerPaciente from '../../../core/mpi/controller/paciente';
import * as cdaCtr from '../../cda/controller/CDAPatient';
import { xmlToJson } from '../../../utils/utils';

let log = debug('mobileApp:paciente');

let router = express.Router();

/**
 * Get paciente
 *
 * @param id {string} id del paciente
 * Chequea que el paciente este asociado a la cuenta
 */

router.get('/paciente/:id', function (req: any, res, next) {
    let idPaciente = req.params.id;
    let pacientes = req.user.pacientes;
    let index = pacientes.findIndex(item => item.id === idPaciente);
    if (index >= 0) {
        return controllerPaciente.buscarPaciente(pacientes[index].id).then((resultado) => {
            // [TODO] Projectar datos que se pueden mostrar al paciente
            let pac = resultado.paciente;
            delete pac.claveBloking;
            delete pac.entidadesValidadoras;
            delete pac.carpetaEfectores;
            delete pac.createdBy;

            return res.json(pac);

        }).catch(error => {
            return res.status(422).send({ message: 'invalid_id' });
        });
    } else {
        return res.status(422).send({ message: 'unauthorized' });
    }
});

/**
 * Modifica datos de contacto y otros
 *
 * @param id {string} id del paciente
 *
 */

router.put('/paciente/:id', function (req: any, res, next) {
    let idPaciente = req.params.id;
    let pacientes = req.user.pacientes;
    let index = pacientes.findIndex(item => item.id === idPaciente);
    if (index >= 0) {
        controllerPaciente.buscarPaciente(pacientes[index].id).then((resultado) => {
            let paciente = resultado.paciente;
            let data: any = {};

            if (req.body.reportarError) {
                data.reportarError = req.body.reportarError;
                data.notaError = req.body.notas;
            }

            if (req.body.direccion) {
                data.direccion = req.body.direccion;
            }
            if (req.body.contacto) {
                data.contacto = req.body.contacto;
            }
            return controllerPaciente.updatePaciente(paciente, data, req).then(p => {
                return res.send({ status: 'OK' });
            }).catch(error => {
                return next(error);
            });

        }).catch(error => {
            return next({ message: 'invalid_id' });
        });
    } else {
        return next({ message: 'unauthorized' });
    }
});

/**
 * Actualización de la dirección y la fotoMobile
 * [No esta en uso]
 */

router.patch('/pacientes/:id', function (req, res, next) {
    let idPaciente = req.params.id;
    let pacientes = (req as any).user.pacientes;
    let index = pacientes.findIndex(item => item.id === idPaciente);

    if (index >= 0) {
        controllerPaciente.buscarPaciente(req.params.id).then((resultado: any) => {
            if (resultado) {
                switch (req.body.op) {
                    case 'updateFotoMobile':
                        controllerPaciente.updateFotoMobile(req, resultado.paciente);
                        break;
                    case 'updateDireccion':
                        controllerPaciente.updateDireccion(req, resultado.paciente);
                        break;
                }

                Auth.audit(resultado.paciente, req);

                resultado.paciente.save(function (errPatch) {
                    if (errPatch) {
                        return next(errPatch);
                    }
                    return res.json(resultado.paciente);
                });
            }
        }).catch((err) => {
            return next(err);
        });
    }
});




router.get('/laboratorios/(:id)', async (req, res, next) => {
    let idPaciente = req.params.id;
    let pacientes = (req as any).user.pacientes;
    let index = pacientes.findIndex(item => item.id === idPaciente);
    if (index >= 0) {
        let limit = parseInt (req.query.limit || 10, 0);
        let skip = parseInt (req.query.skip || 0, 0);
        let cdas: any[] = await cdaCtr.searchByPatient(idPaciente, '4241000179101', { limit, skip });
        for (let cda of cdas) {
            let _xml = await cdaCtr.loadCDA(cda.cda_id);
            let dom: any = xmlToJson(_xml);
            cda.confidentialityCode = dom.ClinicalDocument.confidentialityCode['@attributes'].code;
            cda.title = dom.ClinicalDocument.title['#text'];
            cda.organizacion = dom.ClinicalDocument.custodian.assignedCustodian.representedCustodianOrganization.name['#text'];
        }
        res.json(cdas);
    }
});

export = router;
