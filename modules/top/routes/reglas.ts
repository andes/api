import * as express from 'express';
import * as reglas from '../schemas/reglas';
import { Auth } from './../../../auth/auth.class';
import * as mongoose from 'mongoose';

const router = express.Router();

router.post('/', function (req, res, next) {
    const body = req.body;

    let newRegla = new reglas({
        origen: {
            organizacion: body.origen.organizacion, //   organizacion: { nombre: String, id: mongoose.Types.ObjectId}
            tipoPrestacion: body.origen.tipoPrestacion      //   tipoPrestacion: { nombre: String, id: mongoose.Types.ObjectId}
        },
        destino: {
            organizacion: body.destino.organizacion,
            tipoPrestacion: body.destino.tipoPrestacion,
            profesionales: body.destino.arrProfesionales //   profesionales: [{ nombre: String, apellido: String, id: mongoose.Types.ObjectId}]
        },
        auditable: body.auditable
    });

    // Auth.audit(newRegla, req);
    newRegla.save((err) => {
        if (err) { return next(err); }
        // TODO: Log this
        res.json(newRegla);
    });
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
