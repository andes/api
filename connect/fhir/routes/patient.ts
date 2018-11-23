import * as express from 'express';
import * as configPrivate from '../../../config.private';
import * as parser from '../../fhir/controllers/parser';
import * as validator from '../../fhir/controllers/validator';
import * as checkPatientExist from '../../../utils/checkPatientExist';
import * as codes from '../../fhir/controllers/errorCodes';
import { Matching } from '@andes/match';
import { Client } from 'elasticsearch';
import { Auth } from './../../../auth/auth.class';
import { paciente } from '../../../core/mpi/schemas/paciente';

// Schemas
const router = express.Router();

router.get('/patient/([\$])match', (req, res, next) => {
    if (!Auth.check(req, 'fhir:pacient:match')) {
        return next(codes.status.unauthorized);
    }
    const connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });
    let query;

    let consulta = '';
    consulta += req.query.identifier ? ' ' + req.query.identifier : '';
    consulta += req.query.family ? ' ' + req.query.family : '';
    consulta += req.query.given ? ' ' + req.query.given : '';

    if (consulta.length > 0) {
        query = {
            multi_match: {
                query: consulta,
                type: 'cross_fields',
                fields: ['documento^5', 'apellido^5', 'nombre^3'],
                minimum_should_match: '100%',
            },
        };
    }
    // Configuramos la cantidad de resultados que quiero que se devuelva y la query correspondiente
    const body = {
        size: 3000,
        from: 0,
        query
    };

    // Verificamos que se esté buscando por algún parametro: Identifier, Given or Family
    if (query) {
        connElastic.search({
            index: 'andes',
            body
        })
            .then((searchResult) => {
                const idPacientes: Array<any> = ((searchResult.hits || {}).hits || [])
                    .map((hit) => {
                        const elem = hit._source;
                        elem['id'] = hit._id;
                        return elem.id;
                    });
                parser.pacientesAFHIR(idPacientes).then(datosFhir => {
                    res.send(datosFhir);
                });
            })
            .catch((error) => {
                next(codes.status.error);
            });
    } else {
        return next(codes.status.badRequest);
    }

});

router.post('/', async (req, res, next) => {
    // Recibimos un paciente en formato FHIR y llamamos a la función de validación de formato FHIR
    try {
        if (!Auth.check(req, 'fhir:patient:post')) {
            return next(codes.status.unauthorized);
        }

        const pacienteFhir = req.body;
        const fhirValid = validator.validate(pacienteFhir);
        const connElastic = new Client({
            host: configPrivate.hosts.elastic_main,
        });

        if (fhirValid) {
            // Convierte un paciente FHIR en el esquema de pacientes
            const pac = await parser.FHIRAPaciente(pacienteFhir);
            // Genero clave de Blocking para el paciente
            const match = new Matching();
            pac['claveBlocking'] = match.crearClavesBlocking(pac);
            // Verificamos si el paciente existe en elastic search
            const existe = await checkPatientExist.exists(pac);
            if (existe === 0) {
                // Insertamos el paciente en la BASE ANDES LOCAL
                const newPatient = new paciente(pac);
                Auth.audit(newPatient, req);
                newPatient.save((err) => {
                    if (err) {
                        return next(codes.status.error);
                    }
                    // Quitamos el _id del objeto paciente para guardarlo en elasticSearch
                    const nuevoPac = JSON.parse(JSON.stringify(newPatient));
                    delete nuevoPac._id;
                    connElastic.create({
                        index: 'andes',
                        type: 'paciente',
                        id: newPatient._id.toString(),
                        body: nuevoPac
                    }, (error, response) => {
                        if (error) {
                            return next(codes.status.error);
                        }
                    });
                });

            } else {
                // El paciente ya existe, devuelvo 200
                return next(codes.status.sucess);
            }
            // response
            res.json(pac);
        } else {
            return next(codes.status.badRequest);
        }
    } catch (err) {
        return next(codes.status.error);
    }
});

export = router;
