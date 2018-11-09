import * as express from 'express';
import * as codes from '../../patient/controller/errorCodes';
import { Auth } from '../../../auth/auth.class';
import * as utils from '../../../utils/utils';
import { profesional } from '../../../core/tm/schemas/profesional';
import { encode } from '@andes/fhir/src/practitioner';
// Schemas
const router = express.Router();

router.get('/([\$])match', async (req, res, next) => {
    if (!Auth.check(req, 'fhir:practitioner:match')) {
        return next(codes.status.unauthorized);
    }

    const opciones = {};
    if (req.query.given) {
        opciones['nombre'] =
            RegExp('^.*' + req.query.given + '.*$', 'i');
    }

    if (req.query.family) {
        opciones['apellido'] =
            RegExp('^.*' + req.query.family + '.*$', 'i');
    }

    if (req.query.identifier) {
        opciones['documento'] = utils.makePattern(req.query.identifier);
    }

    const profesionalesFHIR = [];
    const profesionalesAndes = await profesional.find(opciones).cursor({ batchSize: 100 });
    await profesionalesAndes.eachAsync(async (unProf) => {
        const datosFhir = encode(unProf);
        profesionalesFHIR.push(datosFhir);

    });
    res.send(profesionalesFHIR);

});
export = router;
