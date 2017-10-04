import { log } from './../../../core/log/schemas/log';
import { PacienteFHIR } from './../../interfaces/IPacienteFHIR';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as utils from '../../../utils/utils';
import * as parser from '../controller/parser';
import * as validator from '../controller/validator';
import * as checkPatientExist from '../../../utils/checkPatientExist';
import {
    Matching
} from '@andes/match';
import {
    Client
} from 'elasticsearch';
import {
    Auth
} from './../../../auth/auth.class';
let router = express.Router();
// Schemas
import {
    paciente
} from '../../../core/mpi/schemas/paciente';

router.get('/([\$])match', function (req, res, next) {
    // Verificación de permisos
    // if (!Auth.check(req, 'fhir:pacient:match')) {
    //     return next(403);
    // }
    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });
    let query;
    let consulta;
    req.query.identifier ? consulta = req.query.identifier : '';
    req.query.family ? consulta ? consulta = consulta + ' ' + req.query.family : consulta = req.query.family : '';
    req.query.given ? consulta ? consulta = consulta + ' ' + req.query.given : consulta = req.query.given : '';

    // Traigo todos los pacientes
    if (!consulta) {
        query = {
            match_all: {}
        };
    } else {
        query = {
            multi_match: {
                query: consulta,
                type: 'cross_fields',
                fields: ['documento^5', 'nombre', 'apellido^3'],
            }
        };
    }

    // Configuramos la cantidad de resultados que quiero que se devuelva y la query correspondiente
    let body = {
        size: 3000,
        from: 0,
        query: query
    };

    connElastic.search({
        index: 'andes',
        body: body
    })
        .then((searchResult) => {
            let idPacientes: Array<any> = ((searchResult.hits || {}).hits || [])
                .map((hit) => {
                    let elem = hit._source;
                    elem['id'] = hit._id;
                    return elem.id;
                });

            let pacienteFhir = parser.pacientesAFHIR(idPacientes).then(datosFhir => {
                res.send(datosFhir);
            });
        })
        .catch((error) => {
            next(error);
        });
});

router.post('/', async function (req, res, next) {
    // Recibimos un paciente en formato FHIR y llamamos a la función de validación de formato FHIR
    try {
        if (!Auth.check(req, 'mpi:paciente:postAndes')) {
            return next(403);
        }

        let pacienteFhir = req.body;
        let fhirValid = validator.validate(pacienteFhir);

        let connElastic = new Client({
            host: configPrivate.hosts.elastic_main,
        });

        if (fhirValid) {
            // Convierte un paciente FHIR en el esquema de pacientes
            let pac = await parser.FHIRAPaciente(pacienteFhir);
            // Genero clave de Blocking para el paciente
            let match = new Matching();
            pac['claveBlocking'] = match.crearClavesBlocking(pac);
            // Verificamos si el paciente existe en elastic search
            let existe = await checkPatientExist.exists(pac);
            if (existe === 0) {
                // Insertamos el paciente en la BASE ANDES LOCAL
                let newPatient = new paciente(pac);

                Auth.audit(newPatient, req);
                newPatient.save((err) => {
                    if (err) {
                        return next(err);
                    }
                    // Quitamos el _id del objeto paciente para guardarlo en elasticSearch
                    let nuevoPac = JSON.parse(JSON.stringify(newPatient));
                    delete nuevoPac._id;
                    connElastic.create({
                        index: 'andes',
                        type: 'paciente',
                        id: newPatient._id.toString(),
                        body: nuevoPac
                    }, function (error, response) {
                        if (error) {
                            return next(error);
                        }
                    });
                });

            } else {
                // console.log('Ya existe el paciente');
                // TODO UPDATE: Analizar los campos a actualizar. ¿Cómo sabemos que información es más nueva que nuestro REPO?
                // MEGA MATETIME
            }
            // response
            res.json(pac);
        } else {
            return next('El formato del paciente no es válido');
        }
    } catch (err) {
        return next(err);
    }
});

export = router;
