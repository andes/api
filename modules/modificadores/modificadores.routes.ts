import * as express from 'express';
import { asyncHandler } from '@andes/api-tool';
import { Auth } from '../../auth/auth.class';
import { Modificadores } from './modificadores.schema';
import { engine } from './generadorModificadores';

const router = express.Router();

router.post('/modificadores', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    let response: any = {};
    if (req.body.prestacion && req.body.paciente) {
        try {
            const paciente = req.body.paciente;
            const prestacion = req.body.prestacion;
            const modificador: any = await Modificadores.find({ conceptId: prestacion.conceptId });
            if (modificador.length) {
                const condiciones = modificador[0].condicionesPaciente;
                do {
                    const fact = {
                        paciente,
                        condicion: condiciones[0]
                    };
                    response = await engine.run(fact);
                    response = response.almanac.ruleResults[0];
                    condiciones.shift();
                } while (condiciones.length && !response.result);
            }
        } catch (err) {
            return err;
        }
    }
    res.json(response);
}));

export const ModificadoresRouter = router;
