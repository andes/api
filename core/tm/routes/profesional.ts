// import { defaultLimit, maxLimit } from './../../../config';
// import * as express from 'express';
// import { profesional } from '../schemas/profesional';
// import * as utils from '../../../utils/utils';
// // import * as config from '../../../config';

// let router = express.Router();

// /**
//  * @swagger
//  * definition:
//  *   profesional:
//  *     properties:
//  *       documento:
//  *         type: string
//  *       activo:
//  *         type: boolean
//  *       nombre:
//  *         type: string
//  *       apellido:
//  *         type: string
//  *       contacto:
//  *         type: array
//  *         items:
//  *          type: object
//  *          properties:
//  *               tipo:
//  *                  type: string
//  *                  enum: [
//  *                      telefonoFijo,
//  *                      telefonoCelular,
//  *                      email
//  *                  ]
//  *               valor:
//  *                  type: string
//  *               ranking:
//  *                  type: number
//  *               ultimaActualizacion:
//  *                  type: string
//  *                  format: date
//  *               activo:
//  *                  type: boolean
//  *       sexo:
//  *         type: string
//  *         enum: [
//  *              femenino,
//  *              masculino,
//  *              otro
//  *         ]
//  *       genero:
//  *         type: string
//  *         enum: [
//  *           femenino,
//  *           masculino,
//  *           otro
//  *         ]
//  *       fechaNacimiento:
//  *         type: string
//  *         format: date
//  *       fechaFallecimiento:
//  *         type: string
//  *         format: date
//  *       direccion:
//  *         type: array
//  *         items:
//  *             $ref: '#/definitions/direccion'
//  *       estadoCivil:
//  *         type: string
//  *         enum: [
//  *           casado,
//  *           separado,
//  *           divorciado,
//  *           viudo,
//  *           soltero,
//  *           otro
//  *           ]
//  *       foto:
//  *         type: string
//  *       rol:
//  *         type: string
//  *       especialidad:
//  *          type: object
//  *          properties:
//  *            id:
//  *                type: string
//  *            nombre:
//  *                type: string
//  *       matriculas:
//  *          type: array
//  *          items:
//  *              type: object
//  *              properties:
//  *                  numero:
//  *                      type: number
//  *                  descripcion:
//  *                      type: string
//  *                  activo:
//  *                      type: boolean
//  *                  periodo:
//  *                      type: object
//  *                      properties:
//  *                          inicio:
//  *                              type: string
//  *                              format: date
//  *                          fin:
//  *                              type: string
//  *                              format: date
//  */

// /**
//  * @swagger
//  * /profesional:
//  *   get:
//  *     tags:
//  *       - Profesional
//  *     description: Retorna un arreglo de profesionales
//  *     summary: Listar profesionales
//  *     produces:
//  *       - application/json
//  *     responses:
//  *       200:
//  *         description: un arreglo de objetos profesional
//  *         schema:
//  *           $ref: '#/definitions/profesional'
//  * /profesional/{id}:
//  *   get:
//  *     tags:
//  *       - Profesional
//  *     summary: Lista el profesional por distintos filtros
//  *     description: Retorna un objeto profesional
//  *     produces:
//  *       - application/json
//  *     parameters:
//  *       - name: id
//  *         in: path
//  *         description: _Id de un profesional
//  *         required: false
//  *         type: string
//  *       - name: nombre
//  *         in: query
//  *         description: nombre de un profesional
//  *         required: false
//  *         type: string
//  *       - name: apellido
//  *         in: query
//  *         description: apellido de un profesional
//  *         required: false
//  *         type: string
//  *       - name: documento
//  *         in: query
//  *         description: documento del profesional
//  *         required : false
//  *         type: string
//  *       - name: fechaNacimiento
//  *         in: query
//  *         description: fecha de nacimiento del profesional
//  *         required : false
//  *         type: Date
//  *       - name: matriculas.numero
//  *         in: query
//  *         description: número de matrícula del profesional
//  *         required : false
//  *         type: Number
//  *       - name: especialidad.nombre
//  *         in: query
//  *         description: especialidad del profesional
//  *         required : false
//  *         type: string
//  *       - name: skip
//  *         in: query
//  *         description: El valor numerico del skip
//  *         required: false
//  *         type: number
//  *       - name: limit
//  *         in: query
//  *         description: El valor del limit
//  *         required: false
//  *         type: number
//  *     responses:
//  *       200:
//  *         description: Un objeto profesional
//  *         schema:
//  *           $ref: '#/definitions/profesional'
//  */
// router.get('/profesionales/:id*?', function (req, res, next) {
//     let opciones = {};
//     let query;

//     if (req.params.id) {
//         profesional.findById(req.params._id, function (err, data) {
//             if (err) {
//                 return next(err);
//             }
//             res.json(data);
//         });
//     } else {
//         if (req.query.nombre) {
//             opciones['nombre'] = {
//                 '$regex': utils.makePattern(req.query.nombre)
//             };
//         }

//         if (req.query.apellido) {
//             opciones['apellido'] = {
//                 '$regex': utils.makePattern(req.query.apellido)
//             };
//         }

//         if (req.query.nombreCompleto) {
//             opciones['nombre'] = {
//                 '$regex': utils.makePattern(req.query.nombreCompleto)
//             };
//             opciones['apellido'] = {
//                 '$regex': utils.makePattern(req.query.nombreCompleto)
//             };
//         }

//         if (req.query.documento) {
//             opciones['documento'] = utils.makePattern(req.query.documento);
//         }

//         if (req.query.fechaNacimiento) {
//             opciones['fechaNacimiento'] = req.query.fechaNacimiento;
//         }

//         if (req.query.numeroMatricula) {
//             opciones['matriculas.numero'] = req.query.numeroMatricula;
//         }

//         if (req.query.especialidad) {
//             opciones['especialidad.nombre'] = {
//                 '$regex': utils.makePattern(req.query.especialidad)
//             };
//         }
//     }

//     let radix = 10;
//     let skip: number = parseInt(req.query.skip || 0, radix);
//     let limit: number = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);

//     if (req.query.nombreCompleto) {
//         query = profesional.find({ apellido: { '$regex': utils.makePattern(req.query.nombreCompleto) } }).
//             sort({ apellido: 1, nombre: 1 });
//     } else {
//         query = profesional.find(opciones).skip(skip).limit(limit);
//     }

//     query.exec(function (err, data) {
//         if (err) {
//             return next(err);
//         }
//         res.json(data);
//     });

// });

// /**
//  * @swagger
//  * /profesional:
//  *   post:
//  *     tags:
//  *       - Profesional
//  *     description: Cargar una profesional
//  *     summary: Cargar una profesional
//  *     consumes:
//  *       - application/json
//  *     produces:
//  *       - application/json
//  *     parameters:
//  *       - name: profesional
//  *         description: objeto especialidad
//  *         in: body
//  *         required: true
//  *         schema:
//  *           $ref: '#/definitions/profesional'
//  *     responses:
//  *       200:
//  *         description: Un objeto profesional
//  *         schema:
//  *           $ref: '#/definitions/profesional'
//  */
// router.post('/profesionales', function (req, res, next) {
//     let newProfesional = new profesional(req.body);
//     newProfesional.save((err) => {
//         if (err) {
//             return next(err);
//         }
//         res.json(newProfesional);
//     });
// });

// /**
//  * @swagger
//  * /profesional/{id}:
//  *   put:
//  *     tags:
//  *       - Profesional
//  *     description: Actualizar una profesional
//  *     summary: Actualizar una profesional
//  *     consumes:
//  *       - application/json
//  *     produces:
//  *       - application/json
//  *     parameters:
//  *       - name: id
//  *         in: path
//  *         description: Id de una profesional
//  *         required: true
//  *         type: string
//  *       - name: profesional
//  *         description: objeto profesional
//  *         in: body
//  *         required: true
//  *         schema:
//  *           $ref: '#/definitions/profesional'
//  *     responses:
//  *       200:
//  *         description: Un objeto profesional
//  *         schema:
//  *           $ref: '#/definitions/profesional'
//  */
// router.put('/profesionales/:id', function (req, res, next) {
//     profesional.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
//         if (err) {
//             return next(err);
//         }
//         res.json(req.body);
//     });
// });

// /**
//  * @swagger
//  * /profesional/{id}:
//  *   delete:
//  *     tags:
//  *       - Profesional
//  *     description: Eliminar una profesional
//  *     summary: Eliminar una profesional
//  *     consumes:
//  *       - application/json
//  *     produces:
//  *       - application/json
//  *     parameters:
//  *       - name: id
//  *         in: path
//  *         description: Id de una profesional
//  *         required: true
//  *         type: string
//  *
//  *     responses:
//  *       200:
//  *         description: Un objeto profesional
//  *         schema:
//  *           $ref: '#/definitions/profesional'
//  */
// router.delete('/profesionales/:id', function (req, res, next) {
//     profesional.findByIdAndRemove(req.params._id, function (err, data) {
//         if (err) {
//             return next(err);
//         }
//         res.json(data);
//     });
// });

// export = router;

import {
    defaultLimit,
    maxLimit
} from './../../../config';
import * as mongoose from 'mongoose';
import * as express from 'express';
import {
    profesional
} from '../schemas/profesional';
import * as utils from '../../../utils/utils';
import * as config from '../../../config';
import * as fs from 'fs';
import {
    makeFs
} from '../schemas/imagenes';
import {
    makeFsFirma
} from '../schemas/firmaProf';

import * as stream from 'stream';
import * as base64 from 'base64-stream';

let router = express.Router();


// ------------ FOTO --------------
router.post('/profesionales/foto', async(req: any, res, next) => {
    let _base64 = req.body.foto.img;
    let decoder = base64.decode();
    let input = new stream.PassThrough();
    let fotoProf = makeFs();

    // remove la foto vieja antes de insertar la nueva
    fotoProf.find({
        'metadata.idProfesional': req.body.foto.idProfesional
    }, function (err, file) {
        file.forEach(recorre => {
            fotoProf.unlinkById(recorre._id, function (error, unlinkedAttachment) {});
        });
    });
    // inserta en la bd en files y chucks
    fotoProf.write({
            filename: 'foto.png',
            contentType: 'image/jpeg',
            metadata: {
                idProfesional: req.body.foto.idProfesional,
            }
        },
        input.pipe(decoder),
        function (error, createdFile) {
            res.json(createdFile);
        });

    input.end(_base64);
});

let img = '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';
router.get('/profesionales/foto/:id*?', async(req: any, res, next) => {

    let decoder = base64.decode();
    let input = new stream.PassThrough();

    let id = req.params.id;
    let fotoProf = makeFs();
    fotoProf.find({
        'metadata.idProfesional': id
    }, {}, {
        sort: {
            '_id': -1
        }
    }, function (err, file) {
        if (file[0] == null) {
            res.setHeader('Content-Type', 'image/jpeg');
            input.pipe(decoder).pipe(res);
            input.end(img);
        } else {
            var stream1 = fotoProf.readById(file[0].id, function (err2, buffer) {
                if (err2) {
                    return next(err2);
                }
                res.setHeader('Content-Type', file[0].contentType);
                res.setHeader('Content-Length', file[0].length);
                res.end(buffer);
            });
        }
    });

});
// ------------ FIN FOTOS --------------

/**
 * FIRMA
 */
router.post('/profesionales/firma', (req: any, res, errHandler) => {

    // let filename = req.filename;
    // let timestamp = parseInt(filename.split('-')[2].substr(0, filename.split('-')[2].indexOf('.')), 0);

    // resp.json(filename);
    let _base64 = req.body.firma.firmaP;
    let decoder = base64.decode();
    let input = new stream.PassThrough();
    let CDAFiles = makeFsFirma();

    // remove la firma vieja antes de insertar la nueva
    CDAFiles.find({
        'metadata.idProfesional': req.body.firma.idProfesional
    }, function (err, file) {
        file.forEach(recorre => {
            CDAFiles.unlinkById(recorre._id, function (error, unlinkedAttachment) {});
        });
    });
    // inserta en la bd en files y chucks
    CDAFiles.write({
            filename: 'firma.png',
            contentType: 'image/jpeg',
            metadata: {
                idProfesional: req.body.firma.idProfesional,
            }
        },
        input.pipe(decoder),
        function (error, createdFile) {
            res.json(createdFile);
        });
    input.end(_base64);

});


router.get('/profesionales/firma/:id*?', async(req: any, res, next) => {
    let id = req.params.id;
    let fotoProf = makeFsFirma();
    fotoProf.find({
        'metadata.idProfesional': id
    }, {}, {
        sort: {
            '_id': -1
        }
    }, function (err, file) {
        if (file[0] == null) {
            res.send(null);
        } else {
            var stream1 = fotoProf.readById(file[0].id, function (err2, buffer) {
                if (err2) {
                    return next(err2);
                }
                res.setHeader('Content-Type', file[0].contentType);
                res.setHeader('Content-Length', file[0].length);
                res.end(buffer);
            });
        }
    });

});
// ------------ FIN FIRMA --------------


router.get('/profesionales/traePDni/:dni*?', (req: any, res, next) => {
    let dni = req.params.dni;
    profesional.find({
        'documentoNumero': dni
    }, function (err, data) {

        if (err) {
            return next(err);
        }
        res.json(data[0]);
    });

});


/**
 * Upload Fotos
//  */
// router.post('/profesionales/foto/:profId',  (req:any, resp) => {

//         resp.json({ fileName: req.filename});

//     });


/**
 * Get Base64 imgs
 */
router.get('/profesionales/matricula/:profId', (req, resp, errHandler) => {

    let oCredencial = {
        foto: null,
        firmaProfesional: null,
        firmaSupervisor: null
    };


    profesional.findById(req.params.profId).exec((err, prof: any) => {
        if (err) {
            return errHandler(err);
        }
        let pathFirmaSupervisor = './modules/matriculaciones/uploads/firmas/firma-supervisor.jpg';
        let pathFirmaProfesional = './modules/matriculaciones/uploads/firmas/' + prof.ultimaFirma.imgArchivo;
        let pathFoto = './modules/matriculaciones/uploads/fotos/prof-' + req.params.profId + '.jpg';

        fs.readFile(pathFoto, (errReadFoto, fotoB64) => {
            if (errReadFoto) {
                return errHandler(errReadFoto);
            }

            oCredencial.foto = 'data:image/jpeg;base64,' + new Buffer(fotoB64).toString('base64');

            fs.readFile(pathFirmaProfesional, (errReadFirma, firmaProfB64) => {
                if (errReadFirma) {
                    return errHandler(errReadFirma);
                }

                oCredencial.firmaProfesional = 'data:image/jpeg;base64,' + new Buffer(firmaProfB64).toString('base64');

                fs.readFile(pathFirmaSupervisor, (errReadFirmaSup, firmaSupB64) => {
                    if (errReadFirmaSup) {
                        return errHandler(errReadFirmaSup);
                    }

                    oCredencial.firmaSupervisor = 'data:image/jpeg;base64,' + new Buffer(firmaSupB64).toString('base64');
                    resp.json(oCredencial);
                });
            });
        });

    });



});







/**
 * @swagger
 * definition:
 *   profesional:
 *     properties:
 *       documento:
 *         type: string
 *       activo:
 *         type: boolean
 *       nombre:
 *         type: string
 *       apellido:
 *         type: string
 *       contacto:
 *         type: array
 *         items:
 *          type: object
 *          properties:
 *               tipo:
 *                  type: string
 *                  enum: [
 *                      telefonoFijo,
 *                      telefonoCelular,
 *                      email
 *                  ]
 *               valor:
 *                  type: string
 *               ranking:
 *                  type: number
 *               ultimaActualizacion:
 *                  type: string
 *                  format: date
 *               activo:
 *                  type: boolean
 *       sexo:
 *         type: string
 *         enum: [
 *              femenino,
 *              masculino,
 *              otro
 *         ]
 *       genero:
 *         type: string
 *         enum: [
 *           femenino,
 *           masculino,
 *           otro
 *         ]
 *       fechaNacimiento:
 *         type: string
 *         format: date
 *       fechaFallecimiento:
 *         type: string
 *         format: date
 *       direccion:
 *         type: array
 *         items:
 *             $ref: '#/definitions/direccion'
 *       estadoCivil:
 *         type: string
 *         enum: [
 *           casado,
 *           separado,
 *           divorciado,
 *           viudo,
 *           soltero,
 *           otro
 *           ]
 *       foto:
 *         type: string
 *       rol:
 *         type: string
 *       especialidad:
 *          type: object
 *          properties:
 *            id:
 *                type: string
 *            nombre:
 *                type: string
 *       matriculas:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  numero:
 *                      type: number
 *                  descripcion:
 *                      type: string
 *                  activo:
 *                      type: boolean
 *                  periodo:
 *                      type: object
 *                      properties:
 *                          inicio:
 *                              type: string
 *                              format: date
 *                          fin:
 *                              type: string
 *                              format: date
 */

/**
 * @swagger
 * /profesional:
 *   get:
 *     tags:
 *       - Profesional
 *     description: Retorna un arreglo de profesionales
 *     summary: Listar profesionales
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: un arreglo de objetos profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 * /profesional/{id}:
 *   get:
 *     tags:
 *       - Profesional
 *     summary: Lista el profesional por distintos filtros
 *     description: Retorna un objeto profesional
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de un profesional
 *         required: false
 *         type: string
 *       - name: nombre
 *         in: query
 *         description: nombre de un profesional
 *         required: false
 *         type: string
 *       - name: apellido
 *         in: query
 *         description: apellido de un profesional
 *         required: false
 *         type: string
 *       - name: documento
 *         in: query
 *         description: documento del profesional
 *         required : false
 *         type: string
 *       - name: fechaNacimiento
 *         in: query
 *         description: fecha de nacimiento del profesional
 *         required : false
 *         type: Date
 *       - name: matriculas.numero
 *         in: query
 *         description: número de matrícula del profesional
 *         required : false
 *         type: Number
 *       - name: especialidad.nombre
 *         in: query
 *         description: especialidad del profesional
 *         required : false
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
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.get('/profesionales/:id*?', function (req, res, next) {
    if (req.params.id) {

        profesional.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }

            res.json(data);
        });
    } else {
        let query = profesional.find({});

        if (req.query.busquedaDoc) {
            query.where('documentoNumero').equals(RegExp('^.*' + req.query.busquedaDoc + '.*$', 'i'));
        }
        if (req.query.busquedaApellido) {
            query.where('apellido').equals(RegExp('^.*' + req.query.busquedaApellido + '.*$', 'i'));
        }

        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            if (req.params.id && !data) {
                return next(404);
            }
            res.json(data);
        });
        // profesional.find({}, function(err, prof) {
        //     res.json(prof)
        //   });
    }


});



router.get('/profesionales/', function (req, res, next) {


});

/**
 * @swagger
 * /profesional:
 *   post:
 *     tags:
 *       - Profesional
 *     description: Cargar una profesional
 *     summary: Cargar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: profesional
 *         description: objeto especialidad
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/profesional'
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.post('/profesionales', function (req, res, next) {
        profesional.findOne({
            'documentoNumero': req.body.documentoNumero
        }, function (err, person) {
            if (person !== null) {
                res.json(null);
            } else {
                let newProfesional = new profesional(req.body);
                newProfesional.save((err2) => {
                    if (err2) {
                        next(err2);
                    }

                    res.json(newProfesional);
                });

            }

        });




});

/**
 * @swagger
 * /profesional/{id}:
 *   put:
 *     tags:
 *       - Profesional
 *     description: Actualizar una profesional
 *     summary: Actualizar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una profesional
 *         required: true
 *         type: string
 *       - name: profesional
 *         description: objeto profesional
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/profesional'
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.put('/profesionales/:id', function (req, res, next) {
    profesional.findByIdAndUpdate(req.params._id, req.body, {
        new: true
    }, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});


// temporal
router.post('/profesionales/actualizar', function (req, res, next) {
        profesional.findByIdAndUpdate(req.body.id, req.body, {
            new: true
        }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);


        });
});

/**
 * @swagger
 * /profesional/{id}:
 *   delete:
 *     tags:
 *       - Profesional
 *     description: Eliminar una profesional
 *     summary: Eliminar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una profesional
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.delete('/profesionales/:id', function (req, res, next) {
    profesional.findByIdAndRemove(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

export = router;
