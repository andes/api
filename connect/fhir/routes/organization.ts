import * as express from 'express';
import * as codes from '../../fhir/controllers/errorCodes';
import { Auth } from '../../../auth/auth.class';
import * as utils from '../../../utils/utils';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { Organization } from '@andes/fhir';
// Schemas
const router = express.Router();

router.get('/organization/([\$])match', async (req, res, next) => {
    if (!Auth.check(req, 'fhir:organization:match')) {
        return next(codes.status.unauthorized);
    }

    const opciones = {};
    if (req.query.name) {
        opciones['nombre'] =
            RegExp('^.*' + req.query.name + '.*$', 'i');
    }

    if (req.query.identifier as any) {
        opciones['codigo.sisa'] = utils.makePattern(req.query.identifier as any);
    }

    const organizacionesFHIR = [];
    const organizacionesAndes = await Organizacion.find(opciones).cursor({ batchSize: 100 });
    await organizacionesAndes.eachAsync(async (unaOrg) => {
        const datosFhir = Organization.encode(unaOrg);
        organizacionesFHIR.push(datosFhir);

    });
    res.send(organizacionesFHIR);

});

export = router;
