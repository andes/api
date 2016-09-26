import * as express from 'express'
import * as especialidad from '../schemas/especialidad'

var router = express.Router();

/**
 * @swagger
 * definition:
 *   especialidad:
 *     properties:
 *       nombre:
 *         type: string
 *       descripcion:
 *         type: string
 *       complejidad:
 *         type: integer
 *       disciplina:
 *         type: string
 *       codigo.sisa:
 *         type: string
 *       habilitado:
 *         type: Boolean
 *       fechaAlta: 
 *          type: Date
 *       fechaBaja: 
 *          type: Date
 */

/**
 * @swagger
 * /especialidad:
 *   get:
 *     tags:
 *       - Especialidad
 *     description: Returns all especialidad
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: EL nombre o descripción de la especialidad
 *         required: false
 *         type: string
 *       - name: codigo.sisa
 *         in: query
 *         description: El codigo sisa de la especialidad
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: An array of especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 * /especialidad/{id}:
 *   get:
 *     tags:
 *       - Especialidad
 *     description: Returns all especialidad
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: EL nombre o descripción de la especialidad
 *         required: false
 *         type: string
 *       - name: codigo.sisa
 *         in: query
 *         description: El codigo sisa de la especialidad
 *         required: false
 *         type: string
 *       - name: id
 *         in: path
 *         description: _Id de una especialidad
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: An array of especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 */
router.get('/especialidad/:id*?', function(req, res, next) {
    if (req.params.id) {
        
        especialidad.findById(req.params.id, function (err, data) {
        if (err) {
            next(err);
        };

        res.json(data);
    });
    }
    else{
        var query;
        query = especialidad.find({}); //Trae todos 

            if (req.query.codigoSisa)
                query.where('codigo.sisa').equals(req.query.codigoSisa);
            if (req.query.nombre){
                query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
           }
            query.exec((err, data)=> {
                if (err) return next(err);
                res.json(data);
            });
    }
});

router.post('/especialidad', function(req, res, next) {
    var newEspecialidad = new especialidad(req.body)
    newEspecialidad.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newEspecialidad);
    })
});

router.put('/especialidad/:id', function(req, res, next) {
    especialidad.findByIdAndUpdate(req.params.id, req.body, function(err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/especialidad/:id', function(req, res, next) {
    especialidad.findByIdAndRemove(req.params.id, req.body, function(err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
})

export = router;