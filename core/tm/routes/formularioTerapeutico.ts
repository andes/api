import * as express from 'express';
import * as formulario  from '../schemas/formularioTerapeutico';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
let router = express.Router();


router.get('/formularioTerapeutico/:id?', function (req, res, next) {

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {

        formulario.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = formulario.find({'subcapitulos.medicamentos':{$ne: null}});

        if (req.query.capitulo) {
            query.where('capitulo').equals(req.query.capitulo);
        }

        if (!Object.keys(query).length) {
            res.status(400).send('Debe ingresar al menos un parámetro');
            return next(400);
        }

        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});