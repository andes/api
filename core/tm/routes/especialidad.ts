import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import * as especialidad from '../schemas/especialidad_model';
import { defaultLimit, maxLimit } from './../../../config';

const router = express.Router();

/**
 * @swagger
 * definition:
 *   especialidad:
 *     properties:
 *       nombre:
 *          type: string
 *       descripcion:
 *          type: string
 *       complejidad:
 *          type: integer
 *       disciplina:
 *          type: string
 *       codigo:
 *          type: object
 *          properties:
 *              sisa:
 *                  type: string
 *       habilitado:
 *          type: Boolean
 *       fechaAlta:
 *          type: string
 *          format: date
 *       fechaBaja:
 *          type: string
 *          format: date
 */

/**
 * @swagger
 * /especialidad:
 *   get:
 *     tags:
 *       - Especialidad
 *     description: Retorna un arreglo de objetos especialidad
 *     summary: Listar especialidades
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre o descripción de la especialidad
 *         required: false
 *         type: string
 *       - name: sisa
 *         in: query
 *         description: El codigo sisa de la especialidad
 *         required: false
 *         type: string
 *       - name: skip
 *         in: query
 *         description: El valor numerico del skip
 *         required: false
 *         type: number
 *       - name: limit
 *         in: query
 *         description: El valor del limit
 *         required: false
 *         type: number
 *     responses:
 *       200:
 *         description: un arreglo de objetos especialidad
 *         schema:
 *           $ref: '#/definitions/especialidad'
 * /especialidad/{id}:
 *   get:
 *     tags:
 *       - Especialidad
 *     summary: Listar especialidades con filtro por ID
 *     description: Retorna un arreglo de objetos especialidad
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de una especialidad
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: An array of especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 */
router.get('/especialidades/:id*?', (req, res, next) => {
    if ((req.params as any).id) {

        especialidad.findById((req.params as any).id, (err, data) => {
            if (err) {
                return next(err);
            }

            res.json(data);
        });
    } else {
        const radix = 10;
        const skip: number = parseInt(req.query.skip as any || 0, radix);
        const limit: number = Math.min(parseInt(req.query.limit as any || defaultLimit, radix), maxLimit);
        const query = especialidad.find({}).skip(skip).limit(limit); // Trae todos
        if (req.query.codigoSisa as any) { query.where('codigo.sisa').equals(RegExp('^.*' + req.query.codigoSisa as any + '.*$', 'i')); }
        if (req.query.nombre as any) { query.where('nombre').equals(RegExp('^.*' + req.query.nombre as any + '.*$', 'i')); }
        query.exec((err, data) => {
            if (err) { return next(err); }
            res.json(data);
        });
    }
});

/**
 * @swagger
 * /especialidad:
 *   post:
 *     tags:
 *       - Especialidad
 *     description: Cargar una especialidad
 *     summary: Cargar una especialidad
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: especialidad
 *         description: objeto especialidad
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/especialidad'
 *     responses:
 *       200:
 *         description: Un objeto especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 */
router.post('/especialidades', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'tm:especialidad:postEspecialidad')) {
        return next(403);
    }
    const newEspecialidad = new especialidad(req.body);
    newEspecialidad.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newEspecialidad);
    });
});

/**
 * @swagger
 * /especialidad/{id}:
 *   put:
 *     tags:
 *       - Especialidad
 *     description: Actualizar una especialidad
 *     summary: Actualizar una especialidad
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una especialidad
 *         required: true
 *         type: string
 *       - name: especialidad
 *         description: objeto especialidad
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/especialidad'
 *     responses:
 *       200:
 *         description: Un objeto especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 */
router.put('/especialidades/:id', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'tm:especialidad:putEspecialidad')) {
        return next(403);
    }
    especialidad.findByIdAndUpdate((req.params as any).id, req.body, { new: true }, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

/**
 * @swagger
 * /especialidad/{id}:
 *   delete:
 *     tags:
 *       - Especialidad
 *     description: Eliminar una especialidad
 *     summary: Eliminar una especialidad
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una especialidad
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 */
router.delete('/especialidades/:id', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'tm:especialidad:deleteEspecialidad')) {
        return next(403);
    }
    const data = await especialidad.findByIdAndRemove((req.params as any).id).exec();
    return res.json(data);
});

export = router;
