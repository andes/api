import { MongoQuery, ResourceBase } from '@andes/core';
import { ConsentVersion, Consentimiento, PadronElectoral } from '../schemas/consentimiento';
import { Auth } from '../../../auth/auth.class';
import { Paciente } from '../../../core-v2/mpi/paciente';
import { calcularEdad } from '../../../core-v2/mpi/paciente/paciente.schema';
import * as express from 'express';

const router = express.Router();

class ConsentVersionResource extends ResourceBase {
    Model = ConsentVersion;
    resourceName = 'consentversion';
    middlewares = [Auth.authenticate()];
    keyId = '_id';
    searchFileds = {
        programa: MongoQuery.matchString,
        version: MongoQuery.equalMatch,
        titulo: MongoQuery.partialString,
        activo: MongoQuery.equalMatch
    };
}

class ConsentimientoResource extends ResourceBase {
    Model = Consentimiento;
    resourceName = 'consentimiento';
    middlewares = [Auth.authenticate()];
    keyId = '_id';
    searchFileds = {
        pacienteId: MongoQuery.equalMatch,
        programa: MongoQuery.matchString,
        version: MongoQuery.equalMatch
    };
}

class PadronElectoralResource extends ResourceBase {
    Model = PadronElectoral;
    resourceName = 'padronelectoral';
    middlewares = [Auth.authenticate()];
    keyId = '_id';
    searchFileds = {
        matricula: MongoQuery.equalMatch,
        genero: MongoQuery.matchString,
    };
}

router.get('/validarpaciente', Auth.authenticate(), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const { pacienteId, documento, sexo } = req.body;
        if (!pacienteId && (!documento || !sexo)) {
            return res.status(400).json({ message: 'pacienteId es requerido' });
        }
        const paciente = await Paciente.findOne({ documento, sexo });
        if (paciente) {
            const edadPaciente = calcularEdad(paciente.fechaNacimiento, paciente.fechaFallecimiento);
            const p = await PadronElectoral.findOne({ matricula: paciente.documento, genero: paciente.sexo === 'masculino' ? 'M' : paciente.sexo === 'femenino' ? 'F' : 'X' });
            if (edadPaciente && edadPaciente >= 65 && p) {
                return res.status(200).json({ validado: true, message: 'Paciente validado correctamente' });
            }
            return res.status(200).json({ validado: false, message: 'Paciente no validado' });
        }
        return res.status(404).json({ message: 'Paciente no encontrado' });
    } catch (error) {
        return next(error);
    }
});

export const ConsentVersionCtr = new ConsentVersionResource({});
export const ConsentimientoCtr = new ConsentimientoResource({});
export const PadronElectoralCtr = new PadronElectoralResource({});

module.exports = [
    ConsentVersionCtr.makeRoutes(),
    ConsentimientoCtr.makeRoutes(),
    PadronElectoralCtr.makeRoutes(),
    router
];
