import * as express from 'express';
import { Practica } from '../schemas/practica';
import { toArray } from '../../../../utils/utils';
import { Types } from 'mongoose';
import { getPracticasCompletas, getPracticaByCodigo, getPracticasByArea, findById, findByDescripcion } from '../controller/practica';
let router = express.Router();


router.get('/practicas/codigo/:codigo', async (req, res) => {
    res.json(await getPracticaByCodigo(req.params.codigo, req.query.buscarNoNomencladas));
});

router.get('/practicas/area/:area', async (req, res) => {
    let x = await getPracticasByArea(req.params.area);
    res.json(x);
});

router.get('/practicas', async (req, res, next) => {
    if (req.params.id) {
        res.json(await findById(req.params.id));
    } else {
        if (req.query.cadenaInput) {
            let paramBusqueda = req.query.cadenaInput.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
            res.json(await findByDescripcion(paramBusqueda, req.query.buscarSimples));
        } else {
            let ids = Array.isArray(req.query.ids) ? req.query.ids.map((id) => { return Types.ObjectId(id); }) : [Types.ObjectId(req.query.ids)];
            if (req.query.cargarSubpracticas) {
                res.json(await getPracticasCompletas(ids));
            } else {
                if (req.query.fields) {

                    let fields = req.query.fields.split(',');
                    let project: any = {};
                    fields.forEach(field => {
                        if (field === 'codigo') {
                            project.codigo = `$codigo`;
                        } else if (field === 'area') {
                            project.area = `$area`;
                        }
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
                        (data) => { res.json(data); }
                    );

                } else {
                    Practica.find({ _id: { $in: req.query.ids } }).exec((err, data) => {
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
    }
});

export = router;
