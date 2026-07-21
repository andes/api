import { MongoQuery, ResourceBase } from '@andes/core';
import { ConsentimientoVersion, Consentimiento, PadronElectoral } from '../schemas/consentimiento';
import { Auth } from '../../../auth/auth.class';
import { borrarLogConsentimientos, guardarConsentimiento, validarPaciente } from '../controller/consentimiento';
import * as express from 'express';
const router = express.Router();

class ConsentimientoVersionResource extends ResourceBase {
    Model = ConsentimientoVersion;
    resourceName = 'consentimientoVersion';
    middlewares = [Auth.authenticate()];
    keyId = '_id';
    searchFileds = {
        programa: MongoQuery.matchString,
        version: MongoQuery.equalMatch,
        titulo: MongoQuery.partialString,
        activo: MongoQuery.equalMatch
    };
}

class PadronElectoralResource extends ResourceBase {
    Model = PadronElectoral;
    resourceName = 'padronElectoral';
    middlewares = [Auth.authenticate()];
    keyId = '_id';
    searchFileds = {
        matricula: MongoQuery.equalMatch,
        genero: MongoQuery.matchString,
    };
}

router.get('/validarPaciente', Auth.authenticate(), async (req: express.Request, res: express.Response) => {
    const { pacienteId, documento, sexo } = req.query;
    const resultado = await validarPaciente(pacienteId, documento, sexo);
    res.status(resultado.status).json(resultado.message);
});

router.get('/consentimiento', Auth.authenticate(), async (req: express.Request, res: express.Response) => {
    const { pacienteId, programa, version } = req.query;
    const params: any = {};
    if (pacienteId) {
        params.pacienteId = pacienteId;
    }
    if (programa) {
        params.programa = programa;
    }
    if (version) {
        params.version = version;
    }
    const consentimientos: any[] = await Consentimiento.find(params).lean();
    if (consentimientos && consentimientos.length > 0) {
        res.status(200).json(borrarLogConsentimientos(consentimientos));
    } else {
        res.status(404).json({ message: 'Consentimiento no encontrado' });
    }
});

router.post('/consentimiento', Auth.authenticate(), async (req: express.Request, res: express.Response) => {
    const { programa, version, pacienteId, aceptacion } = req.body;
    try {
        const consentimiento = await guardarConsentimiento(programa, version, pacienteId, aceptacion);
        res.status(200).json(consentimiento);
    } catch (error: any) {
        const status = error.status || 500;
        const message = error.message || 'Error al guardar el consentimiento';
        res.status(status).json({ message });
    }
});

export const ConsentimientoVersionCtr = new ConsentimientoVersionResource({});
export const PadronElectoralCtr = new PadronElectoralResource({});

module.exports = [
    ConsentimientoVersionCtr.makeRoutes(),
    PadronElectoralCtr.makeRoutes(),
    router,
];
