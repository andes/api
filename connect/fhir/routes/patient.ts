import * as express from 'express';
import { paciente } from '../../../core/mpi/schemas/paciente';
import * as parser from '../../fhir/controllers/parser';
import * as validator from '../../fhir/controllers/validator';
import * as config from '../../../config';
import * as codes from '../../fhir/controllers/errorCodes';
import { Matching } from '@andes/match';
import { Auth } from './../../../auth/auth.class';
import { matching } from '../../../core/mpi/controller/paciente';

// Schemas
const router = express.Router();

router.get('/patient/([\$])match', async (req, res, next) => {
    if (!Auth.check(req, 'fhir:pacient:match')) {
        return next(codes.status.unauthorized);
    }

    let consulta = '';

    consulta += req.query.identifier ? ' ' + req.query.identifier : '';
    consulta += req.query.family ? ' ' + req.query.family : '';
    consulta += req.query.given ? ' ' + req.query.given : '';

    if (!consulta.length) {
        // Si no se consulta por algún parametro (Identifier, Given or Family) retornamos
        return next(codes.status.badRequest);
    }
    try {
        const pacientes = await matching({ type: 'multimatch', cadenaInput: consulta });
        const pacientesFhir = parser.pacientesAFHIR(pacientes);
        res.send(pacientesFhir);
    } catch (err) {
        return next(codes.status.error);
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

        if (fhirValid) {
            // Convierte un paciente FHIR en el esquema de pacientes
            const pac: any = await parser.FHIRAPaciente(pacienteFhir);
            // Genero clave de Blocking para el paciente
            const match = new Matching();
            pac['claveBlocking'] = match.crearClavesBlocking(pac);
            const pacientesSimilares = await matching({
                type: 'suggest',
                documento: pac.documento,
                apellido: pac.apellido,
                nombre: pac.nombre,
                sexo: pac.sexo,
                fechaNacimiento: pac.fechaNacimiento
            });

            if (pacientesSimilares[0].match >= config.mpi.cotaMatchMax) {
                // El paciente ya existe, devuelvo 200
                return next(codes.status.sucess);
            } else {
                // Insertamos el paciente en la BASE ANDES LOCAL
                const newPatient = new paciente(pac);
                Auth.audit(newPatient, req);
                newPatient.save((err) => {
                    if (err) {
                        return next(codes.status.error);
                    }
                });
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
