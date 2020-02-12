import * as express from 'express';
import { Problema } from '../schemas/registrosProblemas';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.post('/problemas', Auth.authenticate(), async (req, res, next) => {
    try {
        const newProblema = new Problema(req.body);
        Auth.audit(newProblema, req);
        let respuesta = await newProblema.save();
        res.json(respuesta);
    } catch (error) {
        return next(error);
    }
});

router.get('/problemas', Auth.authenticate(), async (req: any, res, next) => {
    try {
        let data = await Problema.find({});
        res.json(data);
    } catch (error) {
        return next(error);
    }
});

router.patch('/problemas/:id', Auth.authenticate(), async (req, res, next) => {
    try {
        let problema: any = await Problema.findById(req.params.id);
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
