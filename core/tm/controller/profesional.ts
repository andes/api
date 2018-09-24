import * as mongoose from 'mongoose';
import { profesional } from '../schemas/profesional';
import * as moment from 'moment';
import { sendSms } from '../../../utils/roboSender/sendSms';
import { turnoSolicitado } from '../../../modules/matriculaciones/schemas/turnoSolicitado';
import * as turno from '../../../modules/matriculaciones/schemas/turno';
import { userScheduler } from '../../../config.private';
import { Auth } from './../../../auth/auth.class';

/**
 * funcion que controla los vencimientos de la matriculas y de ser necesario envia sms y email avisando al profesional.
 */
export async function vencimientoMatriculaGrado() {
    // let profesionales: any = await profesional.find({ 'formacionGrado.matriculado': true, profesionalMatriculado: true }, (data: any) => { return data; });
    let profesionales: any = await profesional.find({ 'formacionGrado.matriculacion.fin': { $lte: new Date() }, 'formacionGrado.matriculado': true, profesionalMatriculado: true });

    for (let _n = 0; _n < profesionales.length; _n++) {
        if (profesionales[_n].habilitado === true) {
            for (let _i = 0; _i < profesionales[_n].formacionGrado.length; _i++) {
                if (profesionales[_n].formacionGrado[_i].matriculacion) {
                    // tslint:disable-next-line:max-line-length
                    // tslint:disable-next-line:max-line-length
                    const notificado = profesionales[_n].formacionGrado[_i].matriculacion[profesionales[_n].formacionGrado[_i].matriculacion.length - 1].notificacionVencimiento;
                    const fechaFin = moment(profesionales[_n].formacionGrado[_i].matriculacion[profesionales[_n].formacionGrado[_i].matriculacion.length - 1].fin);
                    const hoy = moment(new Date());
                    const contactos = profesionales[_n].contactos;
                    let tieneEmail = false;
                    let tieneCelular = false;
                    let numeroCelular;
                    // Comprueba si tiene email y celular
                    contactos.forEach(element => {
                        if (element.tipo === 'email') {
                            tieneEmail = true;
                        }
                        if (element.tipo === 'celular') {
                            tieneCelular = true;
                            numeroCelular = Number(element.valor);
                        }
                    });
                    // // si faltan 5 dias,tiene un celular asignado y no esta notificado envia el mensaje
                    // if (fechaFin.diff(hoy, 'days') <= 5 && notificado === false && tieneCelular) {
                    //     const nombreCompleto = profesionales[_n].apellido + ' ' + profesionales[_n].nombre;
                    //     const smsParams = {
                    //         telefono: numeroCelular,
                    //         // tslint:disable-next-line:max-line-length
                    //         mensaje: 'Estimado ' + nombreCompleto + ', una de sus matriculas esta por vencer, por favor sacar un turno para realizar la renovacion de la misma.',
                    //     };
                    //     // this._profesionalService.enviarSms(smsParams).subscribe();

                    //     sendSms(smsParams);

                    //     // tslint:disable-next-line:max-line-length
                    //     profesionales[_n].formacionGrado[_i].matriculacion[profesionales[_n].formacionGrado[_i].matriculacion.length - 1].notificacionVencimiento = true;
                    //     const datosActualizacionGrado = {
                    //         'descripcion': 'updateEstadoGrado',
                    //         'data': profesionales[_n].formacionGrado,
                    //     };

                    //     actualizar(profesionales[_n].id, datosActualizacionGrado);

                    // }

                    // // si faltan 5 dias,tiene un celular asignado y no esta notificado envia el mail
                    // if (fechaFin.diff(hoy, 'days') <= 5 && notificado === false && tieneEmail) {
                    //     // tslint:disable-next-line:max-line-length
                    //     profesionales[_n].formacionGrado[_i].matriculacion[profesionales[_n].formacionGrado[_i].matriculacion.length - 1].notificacionVencimiento = true;

                    //     // this._profesionalService.enviarMail({ profesional: profesionales[_n] }).subscribe();
                    //     enviarMail(profesionales[_n]);
                    //     const datosActualizacionGrado = {
                    //         'descripcion': 'updateEstadoGrado',
                    //         'data': profesionales[_n].formacionGrado,
                    //     };

                    //     actualizar(profesionales[_n].id, datosActualizacionGrado);
                    // }
                    // si se vence la matricula o se da de baja cambia estados de la misma
                    // tslint:disable-next-line:max-line-length
                    if (profesionales[_n].formacionGrado[_i].matriculado === true && profesionales[_n].formacionGrado[_i].matriculacion[profesionales[_n].formacionGrado[_i].matriculacion.length - 1].fin <= new Date()) {
                        profesionales[_n].formacionGrado[_i].matriculado = false;
                        profesionales[_n].formacionGrado[_i].papelesVerificados = false;
                        const datosActualizacionGrado = {
                            descripcion: 'updateEstadoGrado',
                            data: profesionales[_n].formacionGrado,
                        };

                        actualizar(profesionales[_n]._id, datosActualizacionGrado);

                    }

                }

            }
        }


    }
    // done();
}

export async function vencimientoMatriculaPosgrado() {
    let profesionales: any = await profesional.find({ 'formacionPosgrado.matriculado': true, profesionalMatriculado: true }, (data: any) => { return data; });
    for (let _n = 0; _n < profesionales.length; _n++) {
        if (profesionales[_n].habilitado === true) {
            if (profesionales[_n].formacionPosgrado) {
                for (let _i = 0; _i < profesionales[_n].formacionPosgrado.length; _i++) {
                    if (profesionales[_n].formacionPosgrado[_i].matriculacion.length > 0) {
                        // tslint:disable-next-line:max-line-length
                        const notificado = profesionales[_n].formacionPosgrado[_i].matriculacion[profesionales[_n].formacionPosgrado[_i].matriculacion.length - 1].notificacionVencimiento;
                        const fechaFin = moment(profesionales[_n].formacionPosgrado[_i].matriculacion[profesionales[_n].formacionPosgrado[_i].matriculacion.length - 1].fin);
                        const hoy = moment(new Date());
                        const contactos = profesionales[_n].contactos;
                        let tieneEmail = false;
                        let tieneCelular = false;
                        let numeroCelular;
                        contactos.forEach(element => {
                            if (element.tipo === 'email') {
                                tieneEmail = true;
                            }
                            if (element.tipo === 'celular') {
                                tieneCelular = true;
                                numeroCelular = Number(element.valor);
                            }
                        });

                        // if (fechaFin.diff(hoy, 'days') <= 5 && notificado === false && tieneCelular) {
                        //     const nombreCompleto = profesionales[_n].apellido + ' ' + profesionales[_n].nombre;
                        //     const smsParams = {
                        //         telefono: numeroCelular,
                        //         // tslint:disable-next-line:max-line-length
                        //         mensaje: 'Estimado ' + nombreCompleto + ', una de sus matriculas esta por vencer, por favor sacar un turno para realizar la renovacion de la misma.',
                        //     };
                        //     console.log('entro emnsaje');
                        //     sendSms(smsParams);                    // tslint:disable-next-line:max-line-length
                        //     profesionales[_n].formacionPosgrado[_i].matriculacion[profesionales[_n].formacionPosgrado[_i].matriculacion.length - 1].notificacionVencimiento = true;
                        //     const datosActualizacionFormacionGrado = {
                        //         'descripcion': 'updateEstadoPosGrado',
                        //         'data': profesionales[_n].formacionPosgrado,
                        //     };

                        //     actualizar(profesionales[_n].id, datosActualizacionFormacionGrado);


                        // }
                        // if (fechaFin.diff(hoy, 'days') <= 5 && notificado === false && tieneEmail) {
                        //     // tslint:disable-next-line:max-line-length
                        //     profesionales[_n].formacionPosgrado[_i].matriculacion[profesionales[_n].formacionPosgrado[_i].matriculacion.length - 1].notificacionVencimiento = true;

                        //     enviarMail(profesionales[_n]);
                        //     const datosActualizacionFormacionGrado = {
                        //         'descripcion': 'updateEstadoPosGrado',
                        //         'data': profesionales[_n].formacionPosgrado,
                        //     };
                        //     actualizar(profesionales[_n].id, datosActualizacionFormacionGrado);

                        // }

                        // tslint:disable-next-line:max-line-length
                        if (profesionales[_n].formacionPosgrado[_i].matriculado === true && profesionales[_n].formacionPosgrado[_i].matriculacion[profesionales[_n].formacionPosgrado[_i].matriculacion.length - 1].fin.getFullYear() < new Date().getFullYear()) {
                            profesionales[_n].formacionPosgrado[_i].matriculado = false;
                            profesionales[_n].formacionPosgrado[_i].papelesVerificados = false;
                            const datosActualizacionFormacionGrado = {
                                descripcion: 'updateEstadoPosGrado',
                                data: profesionales[_n].formacionPosgrado,
                            };

                            actualizar(profesionales[_n].id, datosActualizacionFormacionGrado);

                        }
                    }
                }
            }
        }

    }
}

/**
 * funcion que actualiza la formacion grado, formacion posgrado y estados de vencimientos;
 * @param idProfesional  id para hacer el find por el mismo
 * @param opciones datos necesarios para hacer la actualizacion deseada
 */
function actualizar(idProfesional, opciones) {
    profesional.findById(idProfesional, (err, resultado: any) => {
        if (resultado) {
            switch (opciones.descripcion) {
                case 'updateEstadoGrado':
                    resultado.formacionGrado = opciones.data;
                    break;
                case 'updateEstadoPosGrado':
                    resultado.formacionPosgrado = opciones.data;
                    break;
            }

        }
        Auth.audit(resultado, (userScheduler as any));
        resultado.save((err2) => {
        });

    });
}

/**
 * funcion para enviar un email
 * @param unProfesional
 */
function enviarMail(unProfesional) {
    'use strict';
    const config_private = require('../../../config.private');
    const nodemailer = require('nodemailer');
    const _profesional = unProfesional;
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
        return true;
        // Preview only available when sending through an Ethereal account

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });


}

export async function migrarTurnos() {
    let profesionales: any = await profesional.find({ turno: { $gte: new Date() } }, (data: any) => { return data; });
    profesionales.forEach(unProfesional => {
        let tipoDeTurno;
        let turnoSolicitud = {
            nombre: unProfesional.nombre,
            apellido: unProfesional.apellido,
            documento: unProfesional.documento,
            fecha: unProfesional.turno,
            idRenovacion: unProfesional._id
        };


        let formacionGrado = unProfesional.formacionGrado;
        if (formacionGrado.length === 1 && formacionGrado[formacionGrado.length - 1].matriculacion === null) {
            tipoDeTurno = 'matriculacion';
        } else {
            tipoDeTurno = 'renovacion';
        }

        let newTurnoSolicitado = new turnoSolicitado(turnoSolicitud);
        let unTurno: any = newTurnoSolicitado.save((err2) => {

            let nTurno = new turno({
                notificado: false,
                sePresento: false,
                fecha: unProfesional.turno,
                tipo: tipoDeTurno,
                profesional: newTurnoSolicitado._id
            });

            nTurno.save((err) => {
            });

        });


    });
}

export async function matriculaCero() {
    let profesionales: any = await profesional.find({ 'formacionGrado.matriculacion.matriculaNumero': 0 }, (data: any) => { return data; }; )
    let prof = [];
    profesionales.forEach((unProfesional, i) => {
        let formacionGrado = unProfesional.formacionGrado;
        formacionGrado.forEach((element, n) => {
            if (element.matriculacion[element.matriculacion.length - 1].matriculaNumero === 0) {
                unProfesional.formacionGrado[n].matriculacion = null;
            }
        });
        profesional.findByIdAndUpdate(unProfesional.id, unProfesional, (err, resultado: any) => { });
        prof.push(unProfesional);
    });
    return prof;
}


export async function formacionCero() {
    let profesionales: any = await profesional.find({ $where: 'this.formacionGrado.length > 1 && this.formacionGrado[0].matriculacion == null' }, (data: any) => { return data; }; )
    return profesionales;
}
