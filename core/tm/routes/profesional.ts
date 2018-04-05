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
import {
    makeFsFirmaAdmin
} from '../schemas/firmaAdmin';


import * as stream from 'stream';
import * as base64 from 'base64-stream';
import { Auth } from '../../../auth/auth.class';

import { sendSms } from '../../../utils/roboSender/sendSms';


let router = express.Router();


router.get('/profesionales/foto/:id*?', Auth.authenticate(), (req: any, res, next) => {
    if (!Auth.check(req, 'matriculaciones:profesionales:getProfesionalFoto')) {
        return next(403);
    }
    let img = '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';
    let decoder = base64.decode();
    let input = new stream.PassThrough();
    // let id = req.params.id;
    let id = req.query.id;
    let fotoProf = makeFs();
    try {
        fotoProf.find({
            'metadata.idProfesional': id
        }, {}, {
                sort: {
                    '_id': -1
                }
            }, function (err, file) {
                if (file[0] == null) {
                    res.setHeader('Content-Type', 'image/jpeg');
                    // input.pipe(decoder).pipe(res);
                    // input.end(img);
                    res.end(img);
                } else {
                    fotoProf.readById(file[0].id, function (err2, buffer) {
                        if (err2) {
                            return next(err2);
                        }
                        res.setHeader('Content-Type', file[0].contentType);
                        res.setHeader('Content-Length', file[0].length);
                        let _img = buffer.toString('base64');
                        return res.send(_img);
                    });
                }
            });
    } catch (ex) {
        return next(ex);
    }

});
router.get('/profesionales/firma/:id*?', Auth.authenticate(), (req: any, res, next) => {
    if (!Auth.check(req, 'matriculaciones:profesionales:getProfesionalFirma')) {
        return next(403);
    }
    if (req.query.id) {
        let id = req.query.id;
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
                        let firma = buffer.toString('base64');
                        return res.send(firma);
                    });
                }
            });

    }
    if (req.query.firmaAdmin) {

        let idAdmin = req.query.firmaAdmin;
        let fotoAdmin = makeFsFirmaAdmin();
        fotoAdmin.find({
            'metadata.idProfesional': idAdmin
        }, {}, {
                sort: {
                    '_id': -1
                }
            }, function (err, file) {
                if (file[0] == null) {
                    res.send(null);
                } else {
                    var stream1 = fotoAdmin.readById(file[0].id, function (err2, buffer) {
                        if (err2) {
                            return next(err2);
                        }
                        res.setHeader('Content-Type', file[0].contentType);
                        res.setHeader('Content-Length', file[0].length);
                        let firmaAdmin = {
                            firma: buffer.toString('base64'),
                            administracion: file[0].metadata.administracion
                        };
                        return res.send(firmaAdmin);
                    });
                }
            });

    }

});
router.get('/profesionales/matricula/:id', (req, resp, errHandler) => {
    let oCredencial = {
        foto: null,
        firmaProfesional: null,
        firmaSupervisor: null
    };
    profesional.findById(req.params.id).exec((err, prof: any) => {
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
router.get('/profesionales/:id*?', Auth.authenticate(), function (req, res, next) {
    // if (!Auth.check(req, 'matriculaciones:profesionales:getProfesional')) {
    //     return next(403);
    // }
    let opciones = {};
    let query;
    if (req.params.id) {
        profesional.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        if (req.query.nombre) {
            opciones['nombre'] = {
                '$regex': utils.makePattern(req.query.nombre)
            };
        }

        if (req.query.apellido) {
            opciones['apellido'] = {
                '$regex': utils.makePattern(req.query.apellido)
            };
        }
        if (req.query.estado) {
            if (req.query.estado === 'Vigentes') {
                req.query.estado = true;
            }
            if (req.query.estado === 'Suspendidas') {
                req.query.estado = false;
            }
            opciones['formacionGrado.matriculado'] = req.query.estado;
        }

        if (req.query.estadoE) {
            if (req.query.estadoE === 'Vigentes') {
                req.query.estadoE = true;
            }
            if (req.query.estadoE === 'Suspendidas') {
                req.query.estadoE = false;
            }
            opciones['formacionPosgrado.matriculado'] = req.query.estadoE;
        }
        if (req.query.habilitado) {
            opciones['habilitado'] = false;
        }

        if (req.query.nombreCompleto) {
            opciones['nombre'] = {
                '$regex': utils.makePattern(req.query.nombreCompleto)
            };
            opciones['apellido'] = {
                '$regex': utils.makePattern(req.query.nombreCompleto)
            };
        }

        if (req.query.documento) {
            opciones['documento'] = utils.makePattern(req.query.documento);
        }

        if (req.query.bajaMatricula) {
            opciones['formacionGrado.matriculacion.baja.motivo'] = { '$nin': [null] };
        }

        if (req.query.rematriculado) {
            opciones['rematriculado'] = true;
        }

        if (req.query.matriculado) {
            opciones['rematriculado'] = false;
        }

        if (req.query.id) {
            opciones['_id'] = req.query.id;
        }

        if (req.query.fechaNacimiento) {
            opciones['fechaNacimiento'] = req.query.fechaNacimiento;
        }

        if (req.query.numeroMatricula) {
            opciones['matriculas.numero'] = req.query.numeroMatricula;
        }

        if (req.query.especialidad) {
            opciones['especialidad.nombre'] = {
                '$regex': utils.makePattern(req.query.especialidad)
            };
        }
    }

    let radix = 10;
    let skip: number = parseInt(req.query.skip || 0, radix);
    let limit: number = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);

    if (req.query.nombreCompleto) {
        query = profesional.find({
            apellido: {
                '$regex': utils.makePattern(req.query.nombreCompleto)
            }
        }).
            sort({
                apellido: 1,
                nombre: 1
            });
    } else {
        query = profesional.find(opciones).skip(skip).limit(limit);
    }

    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


router.post('/profesionales', Auth.authenticate(), function (req, res, next) {
    if (!Auth.check(req, 'matriculaciones:profesionales:postProfesional')) {
        return next(403);
    }
    if (req.body.imagen) {

        let _base64 = req.body.imagen.img;
        let decoder = base64.decode();
        let input = new stream.PassThrough();
        let fotoProf = makeFs();

        // remove la foto vieja antes de insertar la nueva
        fotoProf.find({
            'metadata.idProfesional': req.body.imagen.idProfesional
        }, function (err, file) {
            file.forEach(recorre => {
                fotoProf.unlinkById(recorre._id, function (error, unlinkedAttachment) { });
            });
        });
        // inserta en la bd en files y chucks
        fotoProf.write({
            filename: 'foto.png',
            contentType: 'image/png',
            metadata: {
                idProfesional: req.body.imagen.idProfesional,
            }
        },
            input.pipe(decoder),
            function (error, createdFile) {
                res.json(createdFile);
            });

        input.end(_base64);

    }
    if (req.body.firma) {
        let _base64 = req.body.firma.firmaP;
        let decoder = base64.decode();
        let input = new stream.PassThrough();
        let firmaProf = makeFsFirma();

        // remove la firma vieja antes de insertar la nueva
        firmaProf.find({
            'metadata.idProfesional': req.body.firma.idProfesional
        }, function (err, file) {
            file.forEach(recorre => {
                firmaProf.unlinkById(recorre._id, function (error, unlinkedAttachment) { });
            });
        });
        // inserta en la bd en files y chucks
        firmaProf.write({
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

    }
    if (req.body.firmaAdmin) {
        let _base64 = req.body.firmaAdmin.firma;
        let decoder = base64.decode();
        let input = new stream.PassThrough();
        let firmaAdmin = makeFsFirmaAdmin();

        // remove la firma vieja antes de insertar la nueva
        firmaAdmin.find({
            'metadata.idProfesional': req.body.firmaAdmin.idProfesional
        }, function (err, file) {
            file.forEach(recorre => {
                firmaAdmin.unlinkById(recorre._id, function (error, unlinkedAttachment) { });
            });
        });
        // inserta en la bd en files y chucks
        firmaAdmin.write({
            filename: 'firmaAdmin.png',
            contentType: 'image/jpeg',
            metadata: {
                idProfesional: req.body.firmaAdmin.idProfesional,
                administracion: req.body.firmaAdmin.nombreCompleto,
            }
        },
            input.pipe(decoder),
            function (error, createdFile) {
                res.json(createdFile);
            });
        input.end(_base64);

    }
    if (req.body.profesional) {
        // console.log(req.body.profesional);
        // profesional.findOne({
        //     'documento': req.body.profesional.documento
        // }, function (err, person) {
        //     if (person) {
        //         res.json(null);
        //     } else {
        let newProfesional = new profesional(req.body.profesional);
        newProfesional.save((err2) => {
            if (err2) {
                next(err2);
            }
            res.json(newProfesional);
        });
        //     // }
        // });
    }

});

router.post('/profesionales/sms', function (req, res, next) {
    let smsOptions = {
        telefono: req.body.telefono,
        mensaje: req.body.mensaje
    };

    if (sendSms(smsOptions)) {
        res.send();
    }

});

router.post('/profesionales/sendMail', function (req, res, next) {
    'use strict';
    const config_private = require('../../../config.private');
    const nodemailer = require('nodemailer');
    const _profesional = req.body.profesional;
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: config_private.enviarMail.host,
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: config_private.enviarMail.auth.user, // generated ethereal user
            pass: config_private.enviarMail.auth.pass // generated ethereal password
        }
    });

    let contactos = _profesional.contactos;
    let email;
    contactos.forEach(element => {
        if (element.tipo === 'email') {
            email = element.valor;
        }
    });

    const html1 = '<strong>Estimado ' + _profesional.nombreCompleto + '</strong> <br> una de sus matriculas esta por vencer, por favor presentarse para realizar la renovacion de la misma.';
    // setup email data with unicode symbols
    let mailOptions = {
        from: '"Matriculaciones Salud" <ultrakite6@gmail.com>', // sender address
        to: email, // list of receivers
        subject: 'Vencimiento', // Subject line
        text: 'Vencimiento?', // plain text body
        html: '' + html1 + '' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return next(error);
        }
        res.send(true);
        // Preview only available when sending through an Ethereal account

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });


});

router.put('/profesionales/actualizar', Auth.authenticate(), function (req, res, next) {
    if (!Auth.check(req, 'matriculaciones:profesionales:putProfesional')) {
        return next(403);
    }
    profesional.findByIdAndUpdate(req.body.id, req.body, {
        new: true
    }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


// El delete está correcto, tomar como modelo para la documentación
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
router.delete('/profesionales/:id', Auth.authenticate(), function (req, res, next) {
    if (!Auth.check(req, 'matriculaciones:profesionales:deleteProfesional')) {
        return next(403);
    }
    profesional.findByIdAndRemove(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.patch('/profesionales/:id?', function (req, res, next) {
    profesional.findById(req.params.id, function (err, resultado: any) {
        if (resultado) {
            switch (req.body.op) {
                case 'updateNotas':
                    resultado.notas = req.body.data;
                    break;
                case 'updateSancion':
                    resultado.sansiones.push(req.body.data);
                    break;
                case 'updatePosGrado':
                    resultado.formacionPosgrado.push(req.body.data);
                    break;
                case 'updateGrado':
                    resultado.formacionGrado.push(req.body.data);
                    break;
                case 'updateOtrosDatos':
                    resultado.OtrosDatos = req.body.data;
                    break;
                case 'updateEstadoGrado':
                    resultado.formacionGrado = req.body.data;
                    break;
                case 'updateEstadoPosGrado':
                    resultado.formacionPosgrado = req.body.data;
                    break;
                case 'updateHabilitado':
                    resultado.habilitado = req.body.data;
                    break;
            }
            if (req.body.agente) {
                resultado.agenteMatriculador = req.body.agente;

            }
        }

        resultado.save((err2) => {
            if (err2) {
                next(err2);
            }
            res.json(resultado);
        });


    });
});

router.get('/resumen/:id*?', function (req, res, next) {

    let opciones = {};
    let query;
    if (req.params.id) {
        profesional.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        if (req.query.nombre) {
            opciones['nombre'] = utils.makePattern(req.query.nombre);
        }

        if (req.query.apellido) {
            opciones['apellido'] = utils.makePattern(req.query.apellido);

        }

        if (req.query.nombreCompleto) {
            opciones['nombre'] = {
                '$regex': utils.makePattern(req.query.nombreCompleto)
            };
            opciones['apellido'] = {
                '$regex': utils.makePattern(req.query.nombreCompleto)
            };
        }

        if (req.query.documento !== '') {
            opciones['documento'] = req.query.documento;
        }

        if (req.query.fechaNacimiento) {
            opciones['fechaNacimiento'] = req.query.fechaNacimiento;
        }

        if (req.query.numeroMatricula) {
            opciones['matriculas.numero'] = req.query.numeroMatricula;
        }

        if (req.query.especialidad) {
            opciones['especialidad.nombre'] = {
                '$regex': utils.makePattern(req.query.especialidad)
            };
        }
    }

    let radix = 10;
    let skip: number = parseInt(req.query.skip || 0, radix);
    let limit: number = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);

    if (req.query.nombreCompleto) {
        query = profesional.find({
            apellido: {
                '$regex': utils.makePattern(req.query.nombreCompleto)
            }
        }).
            sort({
                apellido: 1,
                nombre: 1
            });
    } else {
        query = profesional.find(opciones).skip(skip).limit(limit);
    }

    let select = [];
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        data.forEach(element => {
            let resultado = {
                select: '' + element.nombreCompleto + ' - ' + element.documento + '',
                idRenovacion: element.id,
                nombre: element.nombre,
                apellido: element.apellido,
                fechaNacimiento: element.fechaNacimiento,
                documento: element.documento,
                nacionalidad: element.nacionalidad

            };
            select.push(resultado);

        });
        res.json(select);
    });
});

export = router;
