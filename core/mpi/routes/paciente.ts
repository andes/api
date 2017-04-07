import { matching } from '@andes/match/matching';
import * as express from 'express';
import * as mongoose from 'mongoose';
import { paciente } from '../schemas/paciente';
import { pacienteMpi } from '../schemas/paciente';
import { Client } from 'elasticsearch';
import * as config from '../../../config';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as moment from 'moment';

let router = express.Router();


function sortMatching(a, b) {
    return b.match - a.match;
}

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


/*Consultas de estado de pacientes para el panel de información*/
router.get('/pacientes/counts/', function (req, res, next) {
    let filtro;
    switch (req.query.consulta) {
        case 'validados':
            filtro = {
                estado: 'validado'
            };
            break;
        case 'temporales':
            filtro = {
                estado: 'temporal'
            };
            break;
        case 'fallecidos':
            filtro = {
                fechaFallecimiento: {
                    $exists: true
                }
            };
            break;
    }
    let query = paciente.find(filtro).count();
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


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
 *           $ref: '#/definitions/paciente'
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
 *           $ref: '#/definitions/paciente'
 */

// Simple mongodb query by ObjectId --> better performance
router.get('/pacientes/:id', function (req, res, next) {
    paciente.findById(req.params.id, function (err, data) {
        if (err) {
            next(err);
        } else {
            if (data) {
                // Logger de paciente buscado por ID
                Logger.log(req, 'mpi', 'query', { mongoDB: data });
                res.json(data);
            } else {
                pacienteMpi.findById(req.params.id, function (err2, dataMpi) {
                    if (err2) {
                        next(err2);
                    }
                    res.json(dataMpi);

                });
            }
        }
    });
});

/**
 * @swagger
 * /pacientes:
 *   get:
 *     tags:
 *       - Paciente
 *     description: Retorna un arreglo de objetos Paciente
 *     summary: Buscar pacientes usando ElasticSearch
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: type
 *         description: tipo de búsqueda
 *         in: body
 *         required: true
 *         type: string
 *         enum:
 *              - simplequery
 *              - multimatch
 *              - suggest
 *       - name: cadenaInput
 *         in: body
 *         type: string
 *       - name: claveBlocking
 *         in: body
 *         type: string
 *       - name: percentage
 *         in: body
 *         type: boolean
 *       - name: documento
 *         in: body
 *         type: string
 *       - name: nombre
 *         in: body
 *         type: string
 *       - name: apellido
 *         in: body
 *         type: string
 *       - name: sexo
 *         in: body
 *         type: string
 *       - name: fechaNacimiento
 *         in: body
 *         type: Date
 *       - name: escaneado
 *         in: body
 *         type: boolean
 *     responses:
 *       200:
 *         description: un arreglo de objetos paciente
 *       400:
 *         description: Error- Agregar parámetro de búsqueda
 *
 */
// Search using elastic search
router.get('/pacientes', function (req, res, next) {
    let connElastic = new Client({
        host: config.connectionStrings.elastic_main,
    });

    let query;
    switch (req.query.type) {
        case 'simplequery':
            {
                query = {
                    simple_query_string: {
                        query: '\"' + req.query.documento + '\" + \"' + req.query.apellido + '\" + \"' + req.query.nombre + '\" +' + req.query.sexo,
                        fields: ['documento', 'apellido', 'nombre', 'sexo'],
                        default_operator: 'and'
                    }
                };
            }
            break;
        case 'multimatch':
            {
                query = {
                    multi_match: {
                        query: req.query.cadenaInput,
                        type: 'cross_fields',
                        fields: ['documento^5', 'nombre', 'apellido^3'],
                    }
                };
            }
            break;
        case 'suggest':
            {
                let condicion = {};

                // Sugiere pacientes que tengan la misma clave de blocking
                let campo = req.query.claveBlocking;
                let condicionMatch = {};
                condicionMatch[campo] = {
                    query: req.query.documento,
                    minimum_should_match: 3,
                    fuzziness: 2
                };
                query = {
                    match: condicionMatch
                };
            }
            break;
    };
    // Configuramos la cantidad de resultados que quiero que se devuelva y la query correspondiente
    let body = {
        size: 40,
        from: 0,
        query: query
    };

    // Logger de la consulta a ejecutar
    Logger.log(req, 'mpi', 'query', { elasticSearch: query });

    if (req.query.type === 'suggest') {

        connElastic.search({
            index: 'andes',
            body: body
        })
            .then((searchResult) => {
                // Asigno los valores para el suggest
                let weights = config.configMpi.weightsDefault;

                if (req.query.escaneado) {
                    weights = config.configMpi.weightsScan;
                }

                let porcentajeMatchMax = config.configMpi.cotaMatchMax;
                let porcentajeMatchMin = config.configMpi.cotaMatchMin;
                let listaPacientesMax = [];
                let listaPacientesMin = [];
                let devolverPorcentaje = req.query.percentage;

                let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                    .filter(function (hit) {
                        let paciente = hit._source;
                        paciente.fechaNacimiento = moment(paciente.fechaNacimiento).format('YYYY-MM-DD');
                        let pacDto = {
                            documento: req.query.documento ? req.query.documento.toString() : '',
                            nombre: req.query.nombre ? req.query.nombre : '',
                            apellido: req.query.apellido ? req.query.apellido : '',
                            fechaNacimiento: req.query.fechaNacimiento ? req.query.fechaNacimiento : new Date(),
                            sexo: req.query.sexo ? req.query.sexo : ''
                        };
                        let match = new matching();
                        let valorMatching = match.matchPersonas(paciente, pacDto, weights);
                        paciente['id'] = hit._id;
                        if (valorMatching >= porcentajeMatchMax) {
                            listaPacientesMax.push({
                                id: hit._id,
                                paciente: paciente,
                                match: valorMatching
                            });
                        } else {
                            if (valorMatching >= porcentajeMatchMin && valorMatching < porcentajeMatchMax) {
                                listaPacientesMin.push({
                                    id: hit._id,
                                    paciente: paciente,
                                    match: valorMatching
                                });
                            }
                        }
                    });
                //if (devolverPorcentaje) {

                if (listaPacientesMax.length > 0) {
                    listaPacientesMax.sort(sortMatching);
                    res.send(listaPacientesMax);
                } else {
                    listaPacientesMin.sort(sortMatching);
                    res.send(listaPacientesMin);
                }
                // } else {
                //     results = results.map((hit) => {
                //         let elem = hit._source;
                //         elem['id'] = hit._id;
                //         return elem;
                //     });
                //     res.send(results);
                // }
            })
            .catch((error) => {
                next(error);
            });
    } else { // Es para los casos de multimatch y singlequery
        connElastic.search({
            index: 'andes',
            body: body
        })
            .then((searchResult) => {
                let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                    .map((hit) => {
                        let elem = hit._source;
                        elem['id'] = hit._id;
                        return elem;
                    });
                res.send(results);
            })
            .catch((error) => {
                next(error);
            });
    }
});

router.post('/pacientes/mpi', function (req, res, next) {
    let match = new matching();
    let newPatientMpi = new paciente(req.body);
    // Se genera la clave de blocking
    let claves = match.crearClavesBlocking(newPatientMpi);
    newPatientMpi['claveBlocking'] = claves;

    /*Los repetidos son controlados desde el mpi updater, este post no debería usarse desde un frontend ----> sólo de mpiUpdater*/
    newPatientMpi.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newPatientMpi);
    });
});

router.delete('/pacientes/mpi/:id', function (req, res, next) {
    let ObjectId = (require('mongoose').Types.ObjectId);
    let objectId = new ObjectId(req.params.id);
    let query = {
        _id: objectId
    };
    paciente.findById(query, function (err, patientFound) {
        if (err) {
            return next(err);
        }
        patientFound.remove();
        // Rever este código
        // pacienteMpi.on('es-removed', function (err, res) {
        //     if (err) {
        //         return next(err);
        //     };
        // });
        res.json(patientFound);
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
 *           $ref: '#/definitions/paciente'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 *       409:
 *         description: Un código de error con un array de mensajes de error
 */
router.post('/pacientes', function (req, res, next) {

    let match = new matching();
    let newPatient = new paciente(req.body);
    // Se genera la clave de blocking
    let claves = match.crearClavesBlocking(newPatient);
    newPatient['claveBlocking'] = claves;
    newPatient['apellido'] = newPatient['apellido'].toUpperCase();
    newPatient['nombre'] = newPatient['nombre'].toUpperCase();
    /*Antes del save se podría realizar una búsqueda y matching para evitar cargar repetidos, actualmente este proceso sólo se realiza del lado de la app*/
    Auth.audit(newPatient, req);
    newPatient.save((err) => {
        if (err) {
            return next(err);
        }
        Logger.log(req, 'mpi', 'insert', newPatient);
        res.json(newPatient);
    });
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
 *           $ref: '#/definitions/paciente'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */


router.put('/pacientes/:id', function (req, res, next) {
    let ObjectId = mongoose.Types.ObjectId;
    let objectId = new ObjectId(req.params.id);
    let query = {
        _id: objectId
    };
    let match = new matching();

    paciente.findById(query, function (err, patientFound: any) {
        if (err) {
            return next(404);
        }

        // Guarda los valores originales para el logger
        let pacienteOriginal = patientFound.toObject();

        /*Update de paciente de todos los campos salvo que esté validado*/
        if (patientFound.estado !== 'validado') {
            patientFound.documento = req.body.documento;
            patientFound.estado = req.body.estado;
            patientFound.nombre = req.body.nombre;
            patientFound.apellido = req.body.apellido;
            patientFound.sexo = req.body.sexo;
            patientFound.fechaNacimiento = req.body.fechaNacimiento;
            /*Si es distinto de validado debo generar una nueva clave de blocking */
            let claves = match.crearClavesBlocking(patientFound);
            patientFound.claveBlocking = claves;
        } else {
            patientFound.nombre = req.body.nombre.toUpperCase();
            patientFound.apellido = req.body.apellido.toUpperCase();
        }
        patientFound.genero = req.body.genero;
        patientFound.alias = req.body.alias;
        patientFound.estadoCivil = req.body.estadoCivil;
        patientFound.entidadesValidadoras = req.body.entidadesValidadoras;
        patientFound.financiador = req.body.financiador;
        patientFound.relaciones = req.body.relaciones;
        patientFound.direccion = req.body.direccion;
        patientFound.contacto = req.body.contacto;
        patientFound.identificadores = req.body.identificadores;
        patientFound.scan = req.body.scan;
        patientFound.reportarError = req.body.reportarError;

        // Habilita auditoria y guarda
        Auth.audit(patientFound, req);
        console.log("Paciente a Guardar", patientFound);
        patientFound.save(function (err2) {
            if (err2) {
                console.log(err2);
                return next(err2);
            }
            Logger.log(req, 'mpi', 'update', { original: pacienteOriginal, nuevo: patientFound });
            res.json(patientFound);
        });
    });
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
 *           $ref: '#/definitions/paciente'
 */
router.delete('/pacientes/:id', function (req, res, next) {
    let ObjectId = mongoose.Types.ObjectId;
    let objectId = new ObjectId(req.params.id);
    let query = {
        _id: objectId
    };
    paciente.findById(query, function (err, patientFound) {
        if (err) {
            return next(err);
        }
        Auth.audit(patientFound, req);
        patientFound.remove();

        // jgabriel | 26/03/2017 | Rever este código porque el error ninguna llega al usuario
        // patientFound.on('es-removed', function (err2, res) {
        //     if (err2) {
        //         return next(err2);
        //     };
        // });

        Logger.log(req, 'pacientes', 'delete', patientFound);
        res.json(patientFound);
    });
});

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
 *           $ref: '#/definitions/paciente'
 */

/* Funciones  de operaciones PATCH */
function updateContactos(req, data) {
    data.markModified('contacto');
    data.contacto = req.body.contacto;
}

function updateRelaciones(req, data) {
    data.markModified('relaciones');
    data.relaciones = req.body.relaciones;
}

function updateDireccion(req, data) {
    data.markModified('direccion');
    data.direccion = req.body.direccion;
}

router.patch('/pacientes/:id', function (req, res, next) {
    let ObjectId = mongoose.Types.ObjectId;
    let objectId = new ObjectId(req.params.id);
    // let query = {
    //     _id: objectId
    // };
    paciente.findById(req.params.id, function (err, patientFound) {

        if (err) {
            return next(err);
        }
        switch (req.body.op) {
            case 'updateContactos':
                updateContactos(req, patientFound);
                break;
            case 'updateRelaciones':
                updateRelaciones(req, patientFound);
                break;
            case 'updateDireccion':
                updateDireccion(req, patientFound);
        }
        Auth.audit(patientFound, req);
        console.log('paciente Encontrado:', patientFound)
        patientFound.save(function (errPatch) {
            if (errPatch) {
                console.log('ERROR:', errPatch);
                return next(errPatch);
            }

            // Rever este código
            // patientFound.on('es-indexed', function (errElastic, res) {
            //     if (errElastic) {
            //         return next(errElastic);
            //     }
            //     //  console.log('paciente indexado en elastic');
            // });
            if (err) {
                return next(err);
            };
            return res.json(patientFound);
        });
    });

});

// ESTE ES PARA REVISAR CREO QUE NO VA A IR MAS!!!
// router.post('/pacientes/search/match/:field/:mode/:percentage', function (req, res, next) {
//     // Se realiza la búsqueda match por el field
//     // La búsqueda se realiza por la clave de blocking
//     // Valores posibles para el campo field
//     // claveBlocking, nombre, apellido, documento
//     /* El modo puede ser suggest or exactMatch
//       suggest: a partir de un subconjunto de campós mínimos de una persona,
//       y de la cota mínima de matcheo devuelve un array con posibles pacientes
//       exactMatch: utiliza todos los campos mínimos y la cota superior de matcheo
//       con el objetivo de devolver la misma persona

//       Percentage: es un valor booleano que indica si se devuelve o no el porcentaje de matcheo
//       */

//     let dto = req.body.objetoBusqueda;
//     let condicion = {};
//     let queryMatch = dto.documento;
//     let weights = config.configMpi.weightsDefault;
//     let porcentajeMatch = config.configMpi.cotaMatchMax;
//     let devolverPorcentaje = req.params.percentage;
//     let listaPacientes = [];
//     // Se verifica el modo en que se realiza la búsqueda de pacientes
//     if (req.params.mode) {
//         if (req.params.mode === 'suggest') {
//             weights = config.configMpi.weightsMin;
//             porcentajeMatch = config.configMpi.cotaMatchMin;
//         }
//     }

//     let campo = req.params.field;
//     let condicionMatch = {};
//     condicionMatch[campo] = {
//         query: dto[campo],
//         minimum_should_match: 3,
//         fuzziness: 2
//     }
//     condicion = {
//         match: condicionMatch
//     };

//     let body = {
//         size: 40,
//         from: 0,
//         query: condicion,
//     };

//     let connElastic = new Client({
//         host: config.connectionStrings.elastic_main,
//     });

//     connElastic.search({
//         index: 'andes',
//         body: body
//     })
//         .then((searchResult) => {
//             let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
//                 .filter(function (hit) {
//                     let paciente = hit._source;

//                     let pacDto = {
//                         documento: dto.documento ? dto.documento.toString() : paciente.documento,
//                         nombre: dto.nombre ? dto.nombre : paciente.nombre,
//                         apellido: dto.apellido ? dto.apellido : paciente.apellido,
//                         fechaNacimiento: dto.fechaNacimiento ? dto.fechaNacimiento : paciente.fechaNacimiento,
//                         sexo: dto.sexo ? dto.sexo : paciente.sexo
//                     };
//                     let match = new matching();
//                     let valorMatching = match.matchPersonas(paciente, pacDto, weights);
//                     if (valorMatching >= porcentajeMatch) {
//                         listaPacientes.push({
//                             id: hit._id,
//                             paciente: paciente,
//                             match: valorMatching
//                         });
//                         return paciente;
//                     }
//                 });
//             if (devolverPorcentaje) {
//                 // console.log('LISTA PACIENTES ::' + listaPacientes);
//                 res.send(listaPacientes);
//             } else {
//                 results = results.map((hit) => {
//                     let elem = hit._source;
//                     elem['id'] = hit._id;
//                     return elem;
//                 });
//                 res.send(results);
//             }
//         })
//         .catch((error) => {
//             next(error);
//         });

// });


export = router;
