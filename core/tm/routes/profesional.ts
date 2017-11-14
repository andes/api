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

import { defaultLimit, maxLimit } from './../../../config';
import * as mongoose from 'mongoose';
import * as express from 'express'
import { profesional } from '../schemas/profesional'
import * as utils from '../../../utils/utils'
import * as config from '../../../config';
import * as multer from 'multer';
import * as fs from 'fs';

let router = express.Router();



/**
 * Upload Firmas
 */
router.post('/profesionales/firma/:profId',  (req:any, resp, errHandler) => {

    let filename = req.filename;
    let timestamp = parseInt(filename.split('-')[2].substr(0, filename.split('-')[2].indexOf('.')), 0);

    resp.json(filename);

});

/**
 * Upload Fotos
 */
router.post('/profesionales/foto/:profId',  (req:any, resp) => {
    
        resp.json({ fileName: req.filename});
    
    });

router.post('/profesionales/grid',  (req:any, resp,errHandler) => {
    var mongo = require('mongodb');
    var Grid = require('gridfs-stream');
    console.log("hola")
    // create or use an existing mongodb-native db instance.
    // for this example we'll just create one:
    var db = new mongo.Db('grid', new mongo.Server("127.0.0.1", 27017));
    
    // make sure the db instance is open before passing into `Grid`
    db.open(function (err) {
      if (err) return errHandler(err);
      var gfs = Grid(db, mongo);
      console.log("hola2")

      var writestream = gfs.createWriteStream({filename: 'user.png'});
      fs.createReadStream(__dirname + '/user.png').pipe(writestream);
      // all set!

      writestream.on('close', function (file) {
        // do something with `file`
        console.log(file.filename);
      });
    })

    
});


router.get('/profesionales/grid',  (req:any, resp,errHandler) => {
    var mongo = require('mongodb');
    var Grid = require('gridfs-stream');
    console.log("hola")
    // create or use an existing mongodb-native db instance.
    // for this example we'll just create one:
    var db = new mongo.Db('grid', new mongo.Server("127.0.0.1", 27017));
    

    // make sure the db instance is open before passing into `Grid`
    db.open(function (err) {
      if (err) return errHandler(err);
      var gfs = Grid(db, mongo);
      console.log("hola2")
//write content to file system
// var fs_write_stream = fs.createWriteStream('user.png');

var readstream = gfs.createReadStream('user.png'); 
readstream.on("error", function(err){
    resp.send("No image found with that title"); 
});
readstream.pipe(resp);

//read from mongodb
// var readstream = gfs.createReadStream({
//     filename: 'user.png'
// });
// readstream.pipe(fs_write_stream);
// fs_write_stream.on('close', function () {
//     console.log('file has been written fully!');
// });

    })

    
});


/**
 * Get Base64 imgs
 */
router.get('/profesionales/matricula/:profId', (req, resp, errHandler) => {

    let oCredencial = {
        foto: null,
        firmaProfesional: null,
        firmaSupervisor: null
    };


    profesional.findById(req.params.profId).exec((err, prof:any) => {
        if (err) {
            return errHandler(err);
        }
        console.log(prof)
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
    if(req.params.id){
       
     profesional.findById( req.params.id, function (err, data) {
         if (err) {
             next(err);
         };

         res.json(data);
     });
    }else{
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
        console.log(req.body.documentoNumero)
     
                if (req.body.id) {
                     profesional.findByIdAndUpdate(req.body.id, req.body, { new: true }, function (err, data) {
                         if (err) {
                            return next(err);
                        }
                         console.log("update");
                        res.json(data);
                      
                     
                     });
                    
                } else {
                    profesional.findOne({ 'documentoNumero': req.body.documentoNumero }, function (err, person) {
                        if(person !== null){
                            res.json(null);
                        }
                        else{
                            console.log("insertar");
                            let newProfesional = new profesional(req.body);
                            console.log(req.body),
                            newProfesional.save((err) => {
                    
                                if (err) {
                                    console.log(err);
                                    next(err);
                                }
                    
                                res.json(newProfesional);
                            });

                        }

                     })
                 
                }
            
          

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
    profesional.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
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
})

export = router;
