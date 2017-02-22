import {
    ValidatePatient
} from '../../../utils/validatePatient';
import {
    ValidateFormatDate
} from '../../../utils/validateFormatDate';
import {
    machingDeterministico
} from '../../../utils/machingDeterministico';
import * as express from 'express'
import {
    paciente
} from '../schemas/paciente';
import {
    pacienteMpi
} from '../schemas/paciente';
import * as utils from '../../../utils/utils';
import * as mongoosastic from 'mongoosastic';
import {
    Client
} from 'elasticsearch';
import * as config from '../../../config';
import {
    IPerson
} from '../../../utils/IPerson';
import { dbMpi } from '../../../dbMpi';

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
 * /pacientes:
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
 *           $ref: '#/definitions/pacientes'
 *       400:
 *         description: Error- Agregar parámetro de búsqueda
 *
 * /pacientes/{id}:
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
 *           $ref: '#/definitions/pacientes'
 */
router.get('/pacientes/:id*?', function(req, res, next) {


    if (req.params.id) {

        paciente.findById(req.params.id, function(err, data) {
            if (err) {
                next(err);
            }
            else {
                if (data) {
                    res.json(data);
                } else {
                    pacienteMpi.findById(req.params.id, function(err, dataMpi) {
                      if (err) {
                          next(err);
                      }
                      res.json(dataMpi);

                    })
                }
            }


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

        query.exec(function(err, data) {
            if (err) return next(err);
            res.json(data);
        });

    }

});


router.post('/pacientes/search', function(req, res) {
    console.log('Search')
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

    (paciente as any).search({
        query_string: {
            query: myQuery
        }
    }, {
            from: 0,
            size: 50,
        }, function(err, results) {
            var pacientes = results.hits.hits.map(function(element) {
                return element._source;
            });
            res.send(pacientes);
        });
});


/**
 * @swagger
 * /pacientes:
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
 *           $ref: '#/definitions/pacientes'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/pacientes'
 *       409:
 *         description: Un código de error con un array de mensajes de error
 */


router.post('/pacientes', function(req, res, next) {
    /** TODO: resolver el buscar a los tutores */
    var arrRel = req.body.relaciones;
    var arrTutorSave = [];

    // Validación de campos del paciente del lado de la api
    var continues = ValidatePatient.checkPatient(req.body);
    console.log(continues.errors);
    if (continues.valid) {
        // req.body.fechaNacimiento = ValidateFormatDate.obtenerFecha(req.body.fechaNacimiento);

        var newPatient = new paciente(req.body);
        newPatient.save((err) => {
            if (err) {
                next(err);
            }
            (newPatient as any).on('es-indexed', function() {
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
 * /pacientes:
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
 *           $ref: '#/definitions/pacientes'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/pacientes'
 */
router.put('/pacientes/:id', function(req, res, next) {

    //Validación de campos del paciente del lado de la api
    var continues = ValidatePatient.checkPatient(req.body);
    if (continues.valid) {
        paciente.findByIdAndUpdate(req.params.id, req.body, {
            new: true
        }, function(err, data) {
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
 * /pacientes/{id}:
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
 *           $ref: '#/definitions/pacientes'
 */
router.delete('/pacientes/:id', function(req, res, next) {
    paciente.findByIdAndRemove(req.params.id, function(err, data) {
        if (err)
            return next(err);
        /* Docuemnt is unindexed elasticsearch */
        paciente.on('es-removed', function(err, res) {
            if (err) return next(err);
        });
        res.json(data);
    });
})

/**
 * @swagger
 * /pacientes/{id}:
 *   patch:
 *     tags:
 *       - Paciente
 *     description: Modificar ciertos datos de un paciente
 *     summary: Modificar ciertos datos de un paciente
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
 *           $ref: '#/definitions/pacientes'
 */
router.patch('/pacientes/:id', function(req, res, next) {
    let changes = req.body;
    let conditions = {
        _id: req.params.id
    }

    let update: any = {};
    if (changes.telefono) {
        conditions['contacto.ranking'] = 1;
        update['contacto.$.valor'] = changes.telefono;
        update['contacto.$.ultimaActualizacion'] = new Date();
    }
    if (changes.nombre)
        update['nombre'] = changes.nombre;

    // query.findOneAndUpdate(conditions, update, callback)
    paciente.findOneAndUpdate(conditions, {
        $set: update
    }, function(err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.post('/pacientes/search/multimatch/:query', function(req, res, next) {
    console.log(req.params.query);
    var connElastic = new Client({
        host: config.connectionStrings.elastic_main,
        //  log: 'trace'
    });
    let body = {
        size: 30,
        from: 0,
        query: {
            multi_match: {
                query: req.params.query,
                type: 'cross_fields',
                fields: ['documento^5', 'nombre', 'apellido^3'],
                //tie_breaker: 0.3
            }

        }
    }

    let pacientesMatch = connElastic.search({
        index: 'andes', // andes
        body: body
        // Se comenta la siguiente linea q: `nombre:${value}`
    });
    connElastic.search({
        index: 'andes', // andes
        body: body
        // Se comenta la siguiente linea q: `nombre:${value}`
    })
        .then((searchResult) => {
            let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                .map((hit) => { let elem = hit._source; elem['id'] = hit._id; return elem })
            res.send(results)
        })
        .catch((error) => {
            next(error)
        });

});

router.post('/pacientes/search/simplequery', function(req, res, next) {
    let dto = req.body.objetoBusqueda;

    let connElastic = new Client({
        host: config.connectionStrings.elastic_main,
        //  log: 'trace'
    });
    let condicion = {
        simple_query_string: {
            query: '\"' + dto.documento + '\" + \"' + dto.apellido + '\" + \"' + dto.nombre + '\" +' + dto.sexo,
            // "analyzer": "snowball",
            fields: ["documento", "apellido", "nombre", "sexo"],
            default_operator: 'and'
        }
    }

    let body = {
        size: 40,
        from: 0,
        query: condicion,
    };

    connElastic.search({
        index: 'andes', // andes
        body: body
    })
        .then((searchResult) => {
            let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                .map((hit) => { let elem = hit._source; elem['id'] = hit._id; return elem })
            res.send(results)
        })
        .catch((error) => {
            next(error)
        });

});

router.post('/pacientes/search/match/:field', function(req, res, next) {
    // Se realiza la búsqueda match por el documento en elastic

    var dto = req.body.objetoBusqueda;
    let connElastic = new Client({
        host: config.connectionStrings.elastic_main,
        log: 'trace'
    });
    let condicion = {
        match: {
            documento: {
                query: dto.documento,
                minimum_should_match: 3,
                fuzziness: 2
            }
        }
    }
    let body = {
        size: 40,
        from: 0,
        query: condicion,
    };

    connElastic.search({
        index: 'andes', // andes
        body: body
    })
        .then((searchResult) => {
            let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                .filter(function(hit) {
                    let paciente = hit._source;
                    let weights = {
                        identity: 0.4,
                        name: 0.6,
                        gender: 0,
                        birthDate: 0
                    };
                    let pac: IPerson = {
                        identity: paciente.documento,
                        firstname: paciente.nombre,
                        lastname: paciente.apellido,
                        birthDate: ValidateFormatDate.convertirFecha(paciente.fechaNacimiento),
                        gender: paciente.sexo
                    };

                    let pacDto: IPerson = {
                        identity: dto.documento.toString(),
                        firstname: dto.nombre,
                        lastname: dto.apellido,
                        birthDate: ValidateFormatDate.convertirFecha(paciente.fechaNacimiento),
                        gender: paciente.sexo
                    };

                    let m3 = new machingDeterministico();
                    let valorMatching = m3.maching(pac, pacDto, weights);
                    if (valorMatching >= 0.60)
                        return paciente;
                })
            results = results.map((hit) => { let elem = hit._source; elem['id'] = hit._id; return elem });
            console.log(results)
            res.send(results)
        })
        .catch((error) => {
            next(error)
        });

});


export = router;
