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
    const { pacienteId, documento, sexo } = req.body;
    const resultado = await validarPaciente(pacienteId, documento, sexo);
    res.status(resultado.status).json(resultado.message);
});

router.get('/consentimiento', Auth.authenticate(), async (req: express.Request, res: express.Response) => {
    const { pacienteId, programa, version } = req.query;
    const params: any = {
        pacienteId
    };
    if (programa) {
        params.programa = programa;
    }
    if (version) {
        params.version = version;
    }
    const consentimientos: any[] = await Consentimiento.find(params).lean();
    if (consentimientos) {
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
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el consentimiento' });
    }
});

export const ConsentimientoVersionCtr = new ConsentimientoVersionResource({});
export const PadronElectoralCtr = new PadronElectoralResource({});

module.exports = [
    ConsentimientoVersionCtr.makeRoutes(),
    PadronElectoralCtr.makeRoutes(),
    router,
];
