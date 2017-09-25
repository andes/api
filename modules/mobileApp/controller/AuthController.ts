import * as jwt from 'jsonwebtoken';
import { pacienteApp } from '../schemas/pacienteApp';
import { authApp } from '../../../config.private';
import { Client } from 'elasticsearch';
import { sendMail, MailOptions } from '../../../utils/sendMail';
import { sendSms, SmsOptions } from '../../../utils/sendSms';
import { Matching } from '@andes/match';
import { paciente, pacienteMpi } from '../../../core/mpi/schemas/paciente';
import * as express from 'express';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as constantes from '../../../core/tm/schemas/constantes';
import * as mongoose from 'mongoose';

export const expirationOffset = 1000 * 60 * 60 * 24;

export function verificarCodigo(codigoIngresado, codigo) {
    if (codigoIngresado === codigo) {
        return true;
    } else {
        return false;
    }
}

export function enviarCodigoVerificacion(user) {
    console.log('Enviando mail...');

    let mailOptions: MailOptions = {
        from: configPrivate.enviarMail.options.from,
        to: user.email,
        subject: 'Hola ' + user.email,
        text: 'El código de verificación es: ' + user.codigoVerificacion,
        html: 'El código de verificación es: ' + user.codigoVerificacion
    };

    let smsOptions: SmsOptions = {
        telefono: user.telefono,
        mensaje: user.codigoVerificacion
    }

    sendMail(mailOptions);
    sendSms(smsOptions, function (res) {
        if (res === '0') {
            console.log('El SMS se envío correctamente');
        }
    });
}

export function envioCodigoCount(user: any) {
    // TODO: Implementar si se decide poner un límite al envío de códigos
}

export function generarCodigoVerificacion() {
    let codigo = '';
    let length = 6;
    let caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    return codigo;
}

export function buscarPaciente(id) {
    return new Promise((resolve, reject) => {
        paciente.findById(id, function (err, data) {
            if (err) {
                reject(err);
            } else {
                if (data) {
                    resolve(data);
                } else {
                    pacienteMpi.findById(id, function (err2, dataMpi) {
                        if (err2) {
                            reject(err2);
                        }
                        resolve(dataMpi);
                    });
                }
            }
        });
    });
}

function searchContacto(paciente, key) {
    for (let i = 0; i < paciente.contacto.length; i++) {
        if (paciente.contacto[i].tipo === key) {
            return paciente.contacto[i].valor;
        }
    }
    return null;
}

export function checkAppAccounts(paciente) {
    return new Promise((resolve, reject) => {
        pacienteApp.find({ 'pacientes.id': paciente.id }, function (err, docs: any[]) {
            if (docs.length > 0) {
                return reject({ error: 'account_assigned', account: docs[0] });
            } else {

                let email = searchContacto(paciente, 'email');
                if (email) {

                    pacienteApp.findOne({ email }, function (err, existingUser) {
                        if (existingUser) {
                            return reject({ error: 'email_exists' });
                        } else {
                            return resolve(true);
                        }
                    });

                } else {
                    reject({ error: 'email_not_found' });
                }
            }
        });
    });
}

/**
 * Obtiene una cuenta desde un profesional
 * @param profesional {profesionalSchema}
 */
export function getAccountByProfesional(id) {
    return pacienteApp.findOne({ 'profesionalId': mongoose.Types.ObjectId(id) });
}


/**
 * Crea un usuario de la app mobile a partir de un profesional
 * @param profesional {profesionalSchema}
 */
export function createUserFromProfesional(profesional) {
    let dataPacienteApp: any = {
        profesionalId: profesional.id,
        nombre: profesional.nombre,
        apellido: profesional.apellido,
        email: profesional.documento,
        password: generarCodigoVerificacion(),
        telefono: '',
        envioCodigoCount: 0,
        nacionalidad: 'Argentina',
        documento: profesional.documento,
        fechaNacimiento: profesional.fechaNacimiento,
        sexo: profesional.sexo,
        genero: profesional.genero,
        permisos: [],
        pacientes: []
    };

    let user = new pacienteApp(dataPacienteApp);

    return user.save();

}


/**
 * Crea un usuario de la app mobile a partir de un paciente
 * @param paciente {pacienteSchema}
 */
export function createUserFromPaciente(paciente) {
    return new Promise((resolve, reject) => {
        let dataPacienteApp: any = {
            nombre: paciente.nombre,
            apellido: paciente.apellido,
            email: searchContacto(paciente, 'email'),
            password: generarCodigoVerificacion(),
            telefono: searchContacto(paciente, 'celular'),
            envioCodigoCount: 0,
            nacionalidad: 'Argentina',
            documento: paciente.documento,
            fechaNacimiento: paciente.fechaNacimiento,
            sexo: paciente.genero,
            genero: paciente.genero,
            codigoVerificacion: generarCodigoVerificacion(),
            expirationTime: new Date(Date.now() + expirationOffset),
            permisos: [],
            pacientes: [{
                id: paciente._id,
                relacion: 'principal',
                addedAt: new Date()
            }]
        };

        if (!dataPacienteApp.email) {
            reject({ error: 'email_not_found' });
            return;
        }

        pacienteApp.findOne({ email: dataPacienteApp.email }, function (err, existingUser) {

            if (err) {
                return reject({ error: 'unknow_error' });
            }

            if (existingUser) {
                return reject({ error: 'email_exists' });
            }

            let user = new pacienteApp(dataPacienteApp);

            user.save(function (err, user: any) {

                if (err) {
                    return reject({ error: 'unknow_error' });
                }
                resolve(true);

                enviarCodigoVerificacion(user);

            });

        });

    });
}


/**
 * Matchea el paciente ingresado para ver si esta validado
 * @param data {object}
 */
export function matchPaciente(data) {
    return new Promise((resolve, reject) => {

        let connElastic = new Client({
            host: configPrivate.hosts.elastic_main,
        });

        let campo = 'documento';
        let condicionMatch = {};
        condicionMatch[campo] = {
            query: data.documento,
            minimum_should_match: 3,
            fuzziness: 2
        };
        let query = {
            match: condicionMatch
        };
        let body = {
            size: 100,
            from: 0,
            query: query
        };
        connElastic.search({
            index: 'andes',
            body: body
        }).then((searchResult) => {

            // Asigno los valores para el suggest
            let weights = config.mpi.weightsDefault;

            // if (req.query.escaneado) {
            //     weights = config.mpi.weightsScan;
            // }

            let porcentajeMatchMax = config.mpi.cotaMatchMax;
            let porcentajeMatchMin = config.mpi.cotaMatchMin;
            let listaPacientesMax = [];
            let listaPacientesMin = [];
            // let devolverPorcentaje = data.percentage;

            let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                .filter(function (hit) {
                    let paciente = hit._source;
                    let pacDto = {
                        documento: data.documento ? data.documento.toString() : '',
                        nombre: data.nombre ? data.nombre : '',
                        apellido: data.apellido ? data.apellido : '',
                        fechaNacimiento: data.fechaNacimiento ? moment(data.fechaNacimiento).format('YYYY-MM-DD') : '',
                        sexo: data.genero ? data.genero.toLowerCase() : ''
                    };
                    let pacElastic = {
                        documento: paciente.documento ? paciente.documento.toString() : '',
                        nombre: paciente.nombre ? paciente.nombre : '',
                        apellido: paciente.apellido ? paciente.apellido : '',
                        fechaNacimiento: paciente.fechaNacimiento ? moment(paciente.fechaNacimiento).format('YYYY-MM-DD') : '',
                        sexo: paciente.sexo ? paciente.sexo : ''
                    };
                    console.log(pacElastic);
                    let match = new Matching();
                    let valorMatching = match.matchPersonas(pacElastic, pacDto, weights, 'Levenshtein');
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
                    // console.log("SEARCHRESULT-------------",paciente.documento,paciente.apellido,valorMatching);
                });

            // if (devolverPorcentaje) {
            let sortMatching = function (a, b) {
                return b.match - a.match;
            };

            // cambiamos la condición para lograr que nos devuelva más de una sugerencia
            // ya que la 1ra sugerencia es el mismo paciente.
            // if (listaPacientesMax.length > 0) {
            if (listaPacientesMax.length > 0) {
                listaPacientesMax.sort(sortMatching);
                resolve(listaPacientesMax);
            } else {
                listaPacientesMin.sort(sortMatching);
                resolve(listaPacientesMin);
            }
            // } else {
            //     results = results.map((hit) => {
            //         let elem = hit._source;
            //         elem['id'] = hit._id;
            //         return elem;
            //     });
            //     res.send(results);
            // }
        }).catch((error) => {
            reject(error);
        });
    });
}

/**
 * Actualiza los datos de la cuenta mobile
 * @param data {object} password, email, telefono
 */

export function updateAccount(account, data) {
    return new Promise((resolve, reject) => {

        let promise: any = Promise.resolve();
        let promise_password: any = Promise.resolve();

        if (data.password) {
            promise_password = new Promise((resolve, reject) => {
                account.comparePassword(data.old_password, (err, isMatch) => {
                    if (err) {
                        return reject({ password: 'wrong_password' });
                    }
                    if (isMatch) {
                        account.password = data.password;
                        return resolve();
                    } else {
                        return reject({ password: 'wrong_password' });
                    }
                });
            });
        }

        if (data.telefono) {
            account.telefono = data.telefono;
        }

        if (data.email) {
            account.email = data.email;
            promise = new Promise((resolve, reject) => {
                pacienteApp.findOne({ email: data.email }, function (err, acts) {
                    if (!acts) {
                        resolve();
                    } else {
                        reject({ email: 'account_exists' });
                    }
                })
            });
        }

        Promise.all([promise, promise_password]).then(() => {

            account.save(function (err) {
                if (err) {
                    return reject(err);
                }
                resolve(account);
            });

        }).catch((err) => reject(err));

    });
}
