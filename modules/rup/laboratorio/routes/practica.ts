import * as express from 'express';
import { Practica } from '../schemas/practica';

let router = express.Router();

router.get('/practicas', (req, res, next) => {

    if (req.params.id) {
        let query = Practica.findById(req.params.id);
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
        let paramBusqueda = req.query.cadenaInput;
        paramBusqueda = paramBusqueda.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');

        let query = {
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
    }
});

export = router;
