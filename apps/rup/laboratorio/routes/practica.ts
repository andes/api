import * as express from 'express';
import { Practica } from '../schemas/practica';
import { toArray } from '../../../../utils/utils';
import { Mongoose, Types } from 'mongoose';
let router = express.Router();


router.get('/practicas/codigo/:codigo', (req, res, next) => {
    const redix = 10;
    const codigo: number = parseInt(req.params.codigo, redix);
    let query = { $and: [{ codigoNomenclador: { $ne: '' } }, { codigo: req.params.codigo }] };

    Practica.find(query).then((practicas: any[]) => {
        res.json(practicas.length > 0 ? practicas[0] : null);
    });
});

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
                    { descripcion: { $regex: paramBusqueda } },
                    { nombre: { $regex: paramBusqueda } },
                    { 'concepto.term': { $regex: paramBusqueda } }
                ],
                $and: [{ codigoNomenclador: { $ne: '' } }]
            };

            if (req.query.buscarSimples) {
                query.$and.push({ categoria: { $eq: 'simple' } })
            }

            Practica.find(query).then((practicas: any[]) => {
                res.json(practicas);
            });
        } else {
            let ids = [];
            req.query.ids.split(',').map((id) => { ids.push(Types.ObjectId(id)); });
            query = { _id: { $in: ids } };

            if (req.query.fields) {

                let fields = req.query.fields.split(',');
                let project: any = {};
                fields.forEach(field => {
                    if (field === 'codigo')
                        project.codigo = `$codigo`;
                });

                let pipeline = [
                    {
                        $match: {
                            _id: { $in: ids }
                        }
                    }, {
                        $project: project
                    }
                ];

                toArray(Practica.aggregate(pipeline).cursor({}).exec()).then(
                    (data) => { res.json(data) }
                );

            } else {
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
    }
});

export = router;
