import * as express from 'express';
import { asyncHandler } from '@andes/api-tool';
import { Auth } from '../../auth/auth.class';
import { Modificadores } from './modificadores.schema';
import { engine } from './generadorModificadores';
import { PersonalSaludRouter } from '../personalSalud/personal-salud.routes';

const router = express.Router();

router.get('/modificadores', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    let result;
    if (req.query.prestacion && req.query.paciente) {
        try {
            const paciente = req.query.paciente;
            const prestacion = req.query.prestacion;
            const modificadores: any = await Modificadores.find({ tipoPrestacion: prestacion });
            if (modificadores.length) {
                const fact = {
                    documento: paciente,
                    fuente: modificadores[0].fuente
                };
                result = await engine.run(fact);
            }
        } catch (err) {
            return err;
        }
    }
    res.json(result);
}));

export const ModificadoresRouter = router;
