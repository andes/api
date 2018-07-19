
import * as express from 'express';
import * as reglas from '../schemas/reglas';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as moment from 'moment';
import { toArray } from '../../../utils/utils';

let router = express.Router();

router.get('/reglas/:id?', function (req, res, next) {

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {

        reglas.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = reglas.find({});

        if (req.query.organizacionDestino) {
            query.where('destino.organizacion').equals(req.query.organizacionDestino);
        }

        if (req.query.prestacionDestino) {
            query.where('destino.prestacion').equals(req.query.prestacionDestino);
        }

        // query.sort({ 'horaInicio': 1 });

        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

router.post('/regla', function (req, res, next) {
    let data = new reglas(req.body);
    Auth.audit(data, req);
    data.save((err) => {
        // Logger.log(req, 'citas', 'insert', {
        //     accion: 'Crear Agenda',
        //     ruta: req.url,
        //     method: req.method,
        //     data: data,
        //     err: err || false
        // });
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.put('/regla/:_id', function (req, res, next) {
    reglas.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
