import * as express from 'express';
import { Problema } from '../schemas/registrosProblemas';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.post('/problemas/:idSql', async (req, res, next) => {
    let id = Number(req.params.idSql);
    try {
        let problema: any = await Problema.findOne({ idProblema: id });
        if (problema) {
            if (req.body.estado) {
                problema.estado = req.body.estado;
                Auth.audit(problema, req);
                let respuesta = await problema.save();
                res.json(respuesta);
            }
        } else {
            const newProblema = new Problema(req.body);
            Auth.audit(newProblema, req);
            let respuesta = await newProblema.save();
            res.json(respuesta);
        }
    } catch (error) {
        return next(error);
    }
});

router.get('/problemas', async (req: any, res, next) => {
    try {
        let data = await Problema.find({});
        res.json(data);
    } catch (error) {
        return next(error);
    }
});

router.patch('/problemas/:idSql', async (req, res, next) => {
    try {
        let problema: any = await Problema.findOne({ idSqlProblema: req.params.idSql });
        if (req.body.estado) {
            problema.estado = req.body.estado;
            Auth.audit(problema, req);
            await problema.save();
        }
        res.json(problema);
    } catch (error) {
        return next(error);
    }
});

export = router;
