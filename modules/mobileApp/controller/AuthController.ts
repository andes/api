import * as jwt from 'jsonwebtoken';
import { pacienteApp } from '../schemas/pacienteApp';
import { authApp } from '../../../config.private';
import { Client } from 'elasticsearch';
import { Matching } from '@andes/match';
import { paciente, pacienteMpi } from '../../../core/mpi/schemas/paciente';
import * as express from 'express';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as constantes from '../../../core/tm/schemas/constantes';
import * as mongoose from 'mongoose';
import * as debug from 'debug';
import * as controller from './../../../core/mpi/controller/paciente';

import { sendEmail, IEmail, ISms, sendSms } from '../../../utils/roboSender';

let handlebars = require('handlebars');
import * as fs from 'fs';

let log = debug('AuthController');

export const expirationOffset = 1000 * 60 * 60 * 24;

const TEMPLATE_PATH = './templates/emails/';

export function verificarCodigo(codigoIngresado, codigo) {
    if (codigoIngresado === codigo) {
        return true;
    } else {
        return false;
    }
}

export function enviarCodigoCambioPassword(user) {
    log('Enviando mail...');
    let replacements = {
        username: user.apellido + ', ' + user.nombre,
        codigo: user.restablecerPassword.codigo
    };

    let mailOptions: IEmail = {
        email: user.email,
        subject: 'ANDES - Restablecer contraseña',
        template: 'emails/reset-password.html',
        extras: replacements,
        plainText: 'Su código de verificación para restaurar su password es: ' + user.restablecerPassword.codigo,
    };

    // enviamos email
    sendEmail(mailOptions);

    let sms: ISms = {
        message: 'Su código de verificación para restaurar su password es: ' + user.restablecerPassword.codigo,
        phone: user.telefono
    };

    sendSms(sms);

}

export function enviarCodigoVerificacion(user) {
    log('Enviando mail...');

    let replacements = {
        username: user.apellido + ', ' + user.nombre,
        codigo: user.codigoVerificacion
    };

    let mailOptions: IEmail = {
        email: user.email,
        subject: 'ANDES :: Código de activación',
        template: 'emails/active-app-code.html',
        extras: replacements,
        plainText: 'Estimado ' + replacements.username + ', Su código de activación para ANDES Mobile es: ' + user.codigoVerificacion,
    };

    // enviamos email
    sendEmail(mailOptions);

    let sms: ISms = {
        message: 'ANDES :: Su código de activación para ANDES Mobile es: ' + user.codigoVerificacion,
        phone: user.telefono
    };

    sendSms(sms);
}

export function envioCodigoCount(user: any) {
    // TODO: Implementar si se decide poner un límite al envío de códigos
}



/**
 * Devuelve un listao de los códigos en uso
 */

export function listadoCodigos() {
    return pacienteApp.find({ codigoVerificacion: { $ne: null } }, {codigoVerificacion: 1, _id: 0}).then(listado => {
        let numeros = listado.map((item: any) => item.codigoVerificacion);
        return Promise.resolve(numeros);
    }).catch(() => Promise.reject([]));
}

/**
 * Genera un código de verificación.
 * @param onlyNumber
 */
export function generarCodigoVerificacion(onlyNumber = true) {
    let codigo = '';
    let length = 6;
    let caracteres = onlyNumber ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    return codigo;
}

/**
 * Genera un codigo unico chequeando con la db de pacientes.
 */

export function createUniqueCode() {
    return listadoCodigos().then((listado) => {
        let codigo = generarCodigoVerificacion();
        while (listado.indexOf(codigo) >= 0) {
            codigo = generarCodigoVerificacion();
        }

        return Promise.resolve(codigo);

    });
}


/**
 * Busca un contacto segun la key prevista.
 * @param pacienteData
 * @param key
 */

function searchContacto(pacienteData, key) {
    for (let i = 0; i < pacienteData.contacto.length; i++) {
        if (pacienteData.contacto[i].tipo === key) {
            return pacienteData.contacto[i].valor;
        }
    }
    return null;
}


/**
 * Chequea que una cuenta no exista, antes de crearla
 * @param pacienteData
 */

export function checkAppAccounts(pacienteData) {
    return new Promise((resolve, reject) => {
        pacienteApp.find({ 'pacientes.id': pacienteData.id }, function (err, docs: any[]) {
            if (docs.length > 0) {
                return resolve({ message: 'account_assigned', account: docs[0] });
            } else {
                return resolve({message: 'account_doesntExists', account: null});
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
 * @param pacienteData {pacienteSchema}
 */
export function createUserFromPaciente(pacienteData, contacto) {
    return new Promise(async(resolve, reject) => {
        let dataPacienteApp: any = {
            nombre: pacienteData.nombre,
            apellido: pacienteData.apellido,
            email: contacto.email,
            password: null, /* generarCodigoVerificacion() */
            telefono: contacto.telefono,
            envioCodigoCount: 0,
            nacionalidad: 'Argentina',
            documento: pacienteData.documento,
            fechaNacimiento: pacienteData.fechaNacimiento,
            sexo: pacienteData.genero,
            genero: pacienteData.genero,
            codigoVerificacion: await createUniqueCode(),
            expirationTime: new Date(Date.now() + expirationOffset),
            permisos: [],
            pacientes: [{
                id: pacienteData._id,
                relacion: 'principal',
                addedAt: new Date()
            }]
        };

        if (!dataPacienteApp.email) {
            return reject({ error: 'email_not_found' });
        }

        pacienteApp.findOne({ email: dataPacienteApp.email }, function (err, existingUser) {

            if (err) {
                return reject({ error: 'unknow_error' });
            }

            if (existingUser) {
                return reject({ error: 'email_exists' });
            }

            let user = new pacienteApp(dataPacienteApp);

            user.save(function (errSave, userSaved: any) {

                if (errSave) {
                    return reject(errSave);
                }
                enviarCodigoVerificacion(userSaved);
                resolve(true);

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


            let listaPacientesMax = [];

            // let devolverPorcentaje = data.percentage;

            let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                .filter(function (hit) {
                    let pacienteElastic = hit._source;
                    let pacDto = {
                        documento: data.documento ? data.documento.toString() : '',
                        nombre: data.nombre ? data.nombre : '',
                        apellido: data.apellido ? data.apellido : '',
                        fechaNacimiento: data.fechaNacimiento ? moment(data.fechaNacimiento).format('YYYY-MM-DD') : '',
                        sexo: data.genero ? data.genero.toLowerCase() : ''
                    };
                    let pacElastic = {
                        documento: pacienteElastic.documento ? pacienteElastic.documento.toString() : '',
                        nombre: pacienteElastic.nombre ? pacienteElastic.nombre : '',
                        apellido: pacienteElastic.apellido ? pacienteElastic.apellido : '',
                        fechaNacimiento: pacienteElastic.fechaNacimiento ? moment(pacienteElastic.fechaNacimiento).format('YYYY-MM-DD') : '',
                        sexo: pacienteElastic.sexo ? pacienteElastic.sexo : ''
                    };
                    let match = new Matching();
                    let valorMatching = match.matchPersonas(pacElastic, pacDto, weights, 'Levenshtein');
                    pacienteElastic['id'] = hit._id;
                    if (valorMatching >= config.mpi.cotaAppMobile) {
                        listaPacientesMax.push({
                            id: hit._id,
                            paciente: pacienteElastic,
                            match: valorMatching
                        });
                    }
                });

            let sortMatching = function (a, b) {
                return b.match - a.match;
            };

            if (listaPacientesMax.length > 0) {
                listaPacientesMax.sort(sortMatching);
                resolve(listaPacientesMax);
            } else {
                resolve([]);
            }

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
            promise_password = new Promise((resolvePassword, rejectPassword) => {
                account.comparePassword(data.old_password, (err, isMatch) => {
                    if (err) {
                        return rejectPassword({ password: 'wrong_password' });
                    }
                    if (isMatch) {
                        account.password = data.password;
                        return resolvePassword();
                    } else {
                        return rejectPassword({ password: 'wrong_password' });
                    }
                });
            });
        }

        if (data.telefono) {
            account.telefono = data.telefono;
        }

        if (data.email) {
            account.email = data.email;
            promise = new Promise((resolveEmail, rejectEmail) => {
                pacienteApp.findOne({ email: data.email }, function (err, acts) {
                    if (!acts) {
                        resolveEmail();
                    } else {
                        rejectEmail({ email: 'account_exists' });
                    }
                });
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

/**
 * Realiza un matching de los datos del paciente con el scan
 * @param {pacienteAppSchema} userAccount
 * @param {object} mpiData Datos del paciente para matching
 */
export function verificarCuenta(userAccount, mpiData) {
    return new Promise((resolve, reject) => {
        let pacienteId = userAccount.pacientes[0].id;
        controller.buscarPaciente(pacienteId).then((pac => {

            let match = new Matching();
            let resultadoMatching = match.matchPersonas(mpiData, pac.paciente, config.mpi.weightsScan, 'Levenshtein');

            // no cumple con el numero del matching
            if (resultadoMatching >= config.mpi.cotaMatchMax) {
                return resolve(true);
            }
            return reject();

        })).catch(reject);
    });
}

/**
 * Hbilita una cuenta mobile. Y setea las password del usuario
 * @param {pacienteAppSchema} userAccount
 * @param {string} password
 */
export function habilitarCuenta(userAccount, password) {
    return new Promise((resolve, reject) => {
        userAccount.activacionApp = true;
        userAccount.estadoCodigo = true;
        userAccount.codigoVerificacion = null;
        userAccount.expirationTime = null;
        userAccount.password = password;

        userAccount.save(function (errSave, user) {
            if (errSave) {
                return reject(errSave);
            }
            return resolve(user);
        });
    });
}
