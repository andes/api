import * as express from 'express';
import { Problema } from '../schemas/registrosProblemas';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.post('/problemas', async (req, res, next) => {
    try {
        const newProblema = new Problema(req.body);
        Auth.audit(newProblema, req);
        const respuesta = await newProblema.save();
        res.json(respuesta);
    } catch (error) {
        return next(error);
    }
});

router.get('/problemas', async (req: any, res, next) => {
    try {
        const data = await Problema.find({});
        res.json(data);
    } catch (error) {
        return next(error);
    }
});

router.patch('/problemas/:id', async (req, res, next) => {
    try {
        const problema: any = await Problema.findById(req.params.id);
        if (req.body.estado) {
            problema.estado = req.body.estado;
            problema.resueltoPorId = req.body.resueltoPorId;
            problema.resueltoPor = req.body.resueltoPor;
            Auth.audit(problema, req);
            await problema.save();
        }
        res.json(problema);
    } catch (error) {
        return next(error);
    }
});

export = router;
