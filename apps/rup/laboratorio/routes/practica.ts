import * as express from 'express';
import { Practica } from '../schemas/practica';
import { toArray } from '../../../../utils/utils';
import { Mongoose, Types } from 'mongoose';
let router = express.Router();

router.get('/practicas', (req, res, next) => {
    let query;
    if (req.params.id) {
        query = Practica.findById(req.params.id);
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            if (!data) {
                return next(404);
            }
            res.json(data);
        });
    } else {

        if (req.query.cadenaInput) {
            let paramBusqueda = req.query.cadenaInput;
            paramBusqueda = paramBusqueda.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');

            query = {
                $or: [
                    {codigo: { $regex: paramBusqueda }},
                    {descripcion: { $regex: paramBusqueda }},
                    {nombre: { $regex: paramBusqueda }},
                    {'concepto.term': { $regex: paramBusqueda }}
                ]
            };
            Practica.find(query).then((practicas: any[]) => {
                res.json(practicas);
            });
        } else {
            let ids = [];
            req.query.ids.map( (id) => { ids.push(Types.ObjectId(id)); } );
            query = { _id: { $in: ids } };

            Practica.find(query).exec((err, data) => {
                if (err) {
                    return next(err);
                }
                if (req.params.id && !data) {
                    return next(404);
                }
                res.json(data);
            });
        }
    }
});

export = router;
