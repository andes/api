import * as express from 'express';
import * as localidad from '../schemas/localidad';
import * as mongoose from 'mongoose';
import { toArray } from '../../../utils/utils';

const router = express.Router();

/**
 * @swagger
 * definition:
 *   localidad:
 *     properties:
 *      id:
 *          type: string
 *      nombre:
 *          type: string
 *      provincia:
 *          type: object
 *          properties:
 *              id:
 *                  type: string
 *              nombre:
 *                  type: string

 */

/**
 * @swagger
 * /localidad:
 *   get:
 *     tags:
 *       - Localidad
 *     description: Retorna un arreglo de objetos localidades
 *     summary: Listar localidades
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre o descripción de la localidad
 *         required: false
 *         type: string
 *       - name: provincia
 *         in: query
 *         description: _Id de la provincia
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: un arreglo de objetos localidades
 *         schema:
 *           $ref: '#/definitions/localidad'
 * /localidad/{id}:
 *   get:
 *     tags:
 *       - Localidad
 *     description: Retorna un objeto localidad
 *     summary: buscar localidad por ID
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de la localidad
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: un objeto localidad
 *         schema:
 *           $ref: '#/definitions/localidad'
 */
router.get('/localidades/:id?', (req, res, next) => {

    if (req.params.id) {
        localidad.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }

            res.json(data);
        });
    } else {
        const query = localidad.find({});

        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }
        if (req.query.provincia as any) {
            query.where('provincia._id').equals(mongoose.Types.ObjectId(req.query.provincia as any));
        }

        if (req.query.codigo) {
            query.where('codigoProvincia').equals(Number(req.query.codigo));
        }
        if (req.query.activo) {
            query.where('activo').equals(req.query.activo);
        }

        query.sort({ nombre: 1 }).exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});


export = router;
