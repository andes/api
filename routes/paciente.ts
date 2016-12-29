import {
    ValidatePatient
} from './../utils/validatePatient';
import {
    ValidateFormatDate
} from './../utils/validateFormatDate';

import * as express from 'express'
import * as paciente from '../schemas/paciente';
import * as utils from '../utils/utils';
import * as mongoosastic from 'mongoosastic';

var router = express.Router();

/**
 * @swagger
 * definition:
 *   paciente:
 *     properties:
 *       documento:
 *          type: string
 *       activo: 
 *          type: boolean
 *       estado:
 *          type: string
 *          enum:
 *              - temporal
 *              - identificado
 *              - validado
 *              - recienNacido
 *              - extranjero
 *       nombre:
 *          type: string
 *       apellido:
 *          type: string
 *       alias: 
 *          type: string
 *       contacto:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  tipo:
 *                      type: string
 *                      enum:
 *                          - Teléfono Fijo
 *                          - Teléfono Celular
 *                          - Email
 *                  valor:
 *                      type: string
 *                  ranking:
 *                      type: number 
 *                      format: float
 *                  ultimaActualizacion:
 *                      type: string
 *                      format: date
 *                  activo:
 *                      type: boolean
 *       direccion:    
 *          type: array
 *          items:
 *              $ref: '#/definitions/direccion'
 *       sexo:
 *          type: string
 *          enum:
 *              - femenino
 *              - masculino
 *              - otro
 *       genero:
 *          type: string
 *          enum:
 *              - femenino
 *              - masculino
 *              - otro
 *       fechaNacimiento:
 *          type: string
 *          format: date
 *       fechaFallecimiento:
 *          type: string
 *          format: date
 *       estadoCivil:
 *          type: string
 *          enum:
 *              - casado
 *              - separado
 *              - divorciado
 *              - viudo
 *              - soltero
 *              - otro
 *       foto:
 *          type: string
 *       relaciones:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  relacion:
 *                      type: string
 *                      enum:
 *                          - padre
 *                          - madre
 *                          - hijo
 *                          - tutor
 *                  referencia: 
 *                      $ref: '#/definitions/referencia'
 *                  nombre:
 *                      type: string
 *                  apellido:
 *                      type: string
 *                  documento:
 *                      type: string
 *       financiador:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  id:
 *                      type: string
 *                  nombre:
 *                      type: string
 *                  activo:
 *                      type: boolean
 *                  fechaAlta:
 *                      type: string
 *                      format: date
 *                  fechaBaja:
 *                      type: string
 *                      format: date
 *                  ranking:
 *                      type: number
 *       claveBloking:
 *          type: array
 *          items:
 *              type: string
 *       entidadesValidadoras:
 *          type: array
 *          items:
 *              type: string
 */


/**
 * @swagger
 * /paciente:
 *   get:
 *     tags:
 *       - Paciente
 *     description: Retorna un arreglo de objetos Paciente
 *     summary: Buscar pacientes
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre del paciente
 *         required: false
 *         type: string
 *       - name: apellido
 *         in: query
 *         description: El apellido del paciente
 *         required: false
 *         type: string
 *       - name: documento
 *         in: query
 *         description: El documento del paciente
 *         required: false
 *         type: string
 *       - name: fechaNacimiento
 *         in: query
 *         description: El documento del paciente
 *         required: false
 *         type: string
 *         format: date
 *       - name: estado
 *         in: query
 *         description: El estado del paciente
 *         required: false
 *         type: string
 *         enum: 
 *              - temporal
 *              - identificado
 *              - validado
 *              - recienNacido
 *              - extranjero
 *       - name: sexo
 *         in: query
 *         description: 
 *         required: false
 *         type: string
 *         enum: 
 *              - femenino
 *              - masculino
 *              - otro
 *     responses:
 *       200:
 *         description: un arreglo de objetos paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 *       400:
 *         description: Error- Agregar parámetro de búsqueda
 * 
 * /paciente/{id}:
 *   get:
 *     tags:
 *       - Paciente
 *     description: Retorna un objeto Paciente
 *     summary: Buscar paciente por ID
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id del paciente
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: un arreglo con un paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */
router.get('/paciente/:id*?', function (req, res, next) {
    if (req.params.id) {

        paciente.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        var query;
        var opciones = {};

        if (req.query.nombre) {
            opciones["nombre"] = {
                "$regex": utils.makePattern(req.query.nombre)
            }
        }
        if (req.query.apellido) {
            opciones["apellido"] = {
                "$regex": utils.makePattern(req.query.apellido)
            }
        }
        if (req.query.documento) {
            opciones["documento"] = {
                "$regex": utils.makePattern(req.query.documento)
            }
        }
        if (req.query.fechaNacimiento) {
            opciones["fechaNacimiento"] = {
                "$regex": utils.makePattern(req.query.fechaNacimiento)
            }
        }
        if (req.query.sexo) {
            opciones["sexo"] = req.query.sexo;
        }
        if (req.query.estado) {
            opciones["estado"] = req.query.estado;
        }

        if (!Object.keys(opciones).length) {
            res.status(400).send("Debe ingresar al menos un parámetro");
            return next(400);
        }

        query = paciente.find(opciones).sort({
            apellido: 1,
            nombre: 1
        });

        query.exec(function (err, data) {
            if (err) return next(err);
            res.json(data);
        });

    }

});


router.post('/paciente/search', function (req, res) {
    var lPacientes;
    var obj = req.body.objetoBusqueda;
    var apellido = obj.apellido;
    var nombre = obj.nombre;
    var documento = obj.documento;
    var fechaNacimiento = obj.fechaNacimiento;
    var sexo = obj.sexo;
    var myQuery = "";

    if (fechaNacimiento == "*") {
        //Tengo que controlar esta parte porque si en la fecha le mando comodín (*) falla la consulta.
        myQuery = 'apellido: ' + apellido + ' AND nombre: ' + nombre + ' AND documento: ' + documento + ' AND sexo: ' + sexo;
    } else {
        myQuery = 'apellido: ' + apellido + ' AND nombre: ' + nombre + ' AND documento: ' + documento + ' AND sexo: ' + sexo + ' AND fechaNacimiento: ' + fechaNacimiento;
    }


    //console.log(obj);
    //console.log('Las consulta a ejecutar es: ',myQuery);

    paciente.search({
        query_string: {
            query: myQuery
        }
    }, {
        from: 0,
        size: 50,
    }, function (err, results) {
        var pacientes = results.hits.hits.map(function (element) {
            return element._source;
        });
        res.send(pacientes);
    });
});


/**
 * @swagger
 * /paciente:
 *   post:
 *     tags:
 *       - Paciente
 *     description: Cargar un paciente
 *     summary: Cargar un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: organizacion
 *         description: objeto paciente
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/paciente'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 *       409:
 *         description: Un código de error con un array de mensajes de error
 */


router.post('/paciente', function (req, res, next) {
    /** TODO: resolver el buscar a los tutores */
    var arrRel = req.body.relaciones;
    var arrTutorSave = [];


    //Validación de campos del paciente del lado de la api
    var continues = ValidatePatient.checkPatient(req.body);
    console.log(continues.errors);
    if (continues.valid) {
        req.body.fechaNacimiento = ValidateFormatDate.obtenerFecha(req.body.fechaNacimiento);

        var newPatient = new paciente(req.body);
        newPatient.save((err) => {
            if (err) {
                next(err);
            }
            newPatient.on('es-indexed', function () {
                console.log('paciente indexed');
            });
            res.json(newPatient);
        });
    } else {
        //Devuelvo el conjunto de mensajes de error junto con el código
        var err = {
            status: "409",
            messages: continues.errors
        }

        var errores = "";
        continues.errors.forEach(element => {
            errores = errores + " | " + element
        });

        res.status(409).send("Errores de validación: " + errores)
        return next(err)

    }

});

/**
 * @swagger
 * /paciente:
 *   put:
 *     tags:
 *       - Paciente
 *     description: Actualizar un paciente
 *     summary: Actualizar un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id del paciente
 *         required: true
 *         type: string
 *       - name: paciente
 *         description: objeto paciente
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/paciente'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */
router.put('/paciente/:id', function (req, res, next) {

    //Validación de campos del paciente del lado de la api
    var continues = ValidatePatient.checkPatient(req.body);
    if (continues.valid) {
        paciente.findByIdAndUpdate(req.params.id, req.body, {
            new: true
        }, function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    } else {
        //Devuelvo el conjunto de mensajes de error junto con el código
        var err = {
            status: "409",
            messages: continues.errors
        }

        var errores = "";
        continues.errors.forEach(element => {
            errores = errores + " | " + element
        });

        res.status(409).send("Errores de validación: " + errores)
        return next(err)

    }

});

/**
 * @swagger
 * /paciente/{id}:
 *   delete:
 *     tags:
 *       - Paciente
 *     description: Eliminar un paciente
 *     summary: Eliminar un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de un paciente
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */
router.delete('/paciente/:id', function (req, res, next) {
    paciente.findByIdAndRemove(req.params.id, function (err, data) {
        if (err)
            return next(err);
        /* Docuemnt is unindexed elasticsearch */
        paciente.on('es-removed', function (err, res) {
            if (err) return next(err);
        });
        res.json(data);
    });
})

export = router;