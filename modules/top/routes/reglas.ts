import * as express from 'express';
import * as reglas from '../schemas/reglas';
import { Auth } from './../../../auth/auth.class';
import * as mongoose from 'mongoose';
import * as reglasCtrl from '../controller/reglas';

const router = express.Router();

router.post('/reglas', function (req, res, next) {
    let ArrReglas = req.body.reglas;
    let data = reglasCtrl.guardarReglas(ArrReglas);
    Promise.all(data.lista).then(resultado => {
        return (data.resultados);
    }).catch(error => { return (error); });
    res.json(data.resultados);
});

router.get('/reglas/:idDestino?', function (req, res, next) {
    let query = reglas.find({});
    if (req.query.idDestino) {
        query.where('destino.organizacion.id').equals(new mongoose.Types.ObjectId(req.query.idDestino));
    }
    if (req.query.prestacionDestino) {
        query.where('destino.prestacion.conceptId').equals(req.query.prestacionDestino);
    }
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
