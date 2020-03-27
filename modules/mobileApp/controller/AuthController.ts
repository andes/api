import { pacienteApp as PacienteApp } from '../schemas/pacienteApp';
import { Client } from 'elasticsearch';
import { Matching } from '@andes/match';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as debug from 'debug';
import * as controller from './../../../core/mpi/controller/paciente';
import { sendEmail, IEmail, ISms, sendSms } from '../../../utils/roboSender';

const log = debug('AuthController');

export const expirationOffset = 1000 * 60 * 60 * 24;

export function verificarCodigo(codigoIngresado, codigo) {
    if (codigoIngresado === codigo) {
        return true;
    } else {
        return false;
    }
}

export function enviarCodigoCambioPassword(user) {
    log('Enviando mail...');
    const replacements = {
        username: user.apellido + ', ' + user.nombre,
        codigo: user.restablecerPassword.codigo
    };

    const mailOptions: IEmail = {
        email: user.email,
        subject: 'ANDES - Restablecer contraseña',
        template: 'emails/reset-password.html',
        extras: replacements,
        plainText: 'Su código de verificación para restaurar su password es: ' + user.restablecerPassword.codigo,
    };

    // enviamos email
    sendEmail(mailOptions);

    const sms: ISms = {
        message: 'Su código de verificación para restaurar su password es: ' + user.restablecerPassword.codigo,
        phone: user.telefono
    };

    sendSms(sms);

}

export function enviarCodigoVerificacion(user, password) {
    const replacements = {
        username: user.apellido + ', ' + user.nombre,
        codigo: password
    };

    const mailOptions: IEmail = {
        email: user.email,
        subject: 'ANDES :: Código de activación',
        template: 'emails/active-app-code.html',
        extras: replacements,
        plainText: 'Estimado ' + replacements.username + ', Su código de activación para ANDES Mobile es: ' + password,
    };

    // enviamos email
    sendEmail(mailOptions);

    // let sms: ISms = {
    //     message: 'ANDES :: Su código de activación para ANDES Mobile es: ' + user.codigoVerificacion,
    //     phone: user.telefono
    // };

    // sendSms(sms);
}

/**
 * Devuelve un listao de los códigos en uso
 */

export function listadoCodigos() {
    return PacienteApp.find({ codigoVerificacion: { $ne: null } }, { codigoVerificacion: 1, _id: 0 }).then(listado => {
        const numeros = listado.map((item: any) => item.codigoVerificacion);
        return Promise.resolve(numeros);
    }).catch(() => Promise.reject([]));
}

/**
 * Genera un código de verificación.
 * @param onlyNumber
 */
export function generarCodigoVerificacion(onlyNumber = true) {
    let codigo = '';
    const length = 6;
    const caracteres = onlyNumber ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
 * Chequea que una cuenta no exista, antes de crearla
 * @param pacienteData
 */

export function checkAppAccounts(pacienteData) {
    return new Promise((resolve, reject) => {
        PacienteApp.find({ 'pacientes.id': pacienteData.id }, (err, docs: any[]) => {
            if (docs.length > 0) {
                return resolve({ message: 'account_assigned', account: docs[0] });
            } else {
                return resolve({ message: 'account_doesntExists', account: null });
            }
        });
    });
}

/**
 * Obtiene una cuenta desde un profesional
 * @param profesional {profesionalSchema}
 */
export function getAccountByProfesional(id) {
    return PacienteApp.findOne({ profesionalId: mongoose.Types.ObjectId(id) });
}


/**
 * Crea un usuario de la app mobile a partir de un profesional
 * @param profesional {profesionalSchema}
 */
export function createUserFromProfesional(profesional) {
    const dataPacienteApp: any = {
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

    const user = new PacienteApp(dataPacienteApp);

    return user.save();

}


/**
 * Crea un usuario de la app mobile a partir de un paciente
 * @param pacienteData {pacienteSchema}
 */
export function createUserFromPaciente(pacienteData, contacto) {
    return new Promise(async (resolve, reject) => {
        const passw = generarCodigoVerificacion();

        const dataPacienteApp: any = {
            nombre: pacienteData.nombre,
            apellido: pacienteData.apellido,
            email: contacto.email,
            password: passw,
            telefono: contacto.telefono,
            nacionalidad: 'Argentina',
            documento: pacienteData.documento,
            fechaNacimiento: pacienteData.fechaNacimiento,
            sexo: pacienteData.genero,
            genero: pacienteData.genero,
            activacionApp: false,
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
        const email = contacto.email.toLowerCase();
        PacienteApp.findOne({ email }, (err, existingUser) => {

            if (err) {
                return reject({ error: 'unknow_error' });
            }

            if (existingUser) {
                return reject({ error: 'email_exists' });
            }
            dataPacienteApp.email = email;
            const user = new PacienteApp(dataPacienteApp);

            user.save((errSave, userSaved: any) => {

                if (errSave) {
                    return reject(errSave);
                }
                enviarCodigoVerificacion(userSaved, passw);
                resolve(user);

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

        const connElastic = new Client({
            host: configPrivate.hosts.elastic_main,
        });

        const campo = 'documento';
        const condicionMatch = {};
        condicionMatch[campo] = {
            query: data.documento,
            minimum_should_match: 3,
            fuzziness: 2
        };
        const query = {
            match: condicionMatch
        };
        const body = {
            size: 100,
            from: 0,
            query
        };
        connElastic.search({
            index: 'andes',
            body
        }).then((searchResult) => {

            // Asigno los valores para el suggest
            const weights = config.mpi.weightsDefault;

            // if (req.query.escaneado) {
            //     weights = config.mpi.weightsScan;
            // }


            const listaPacientesMax = [];

            // let devolverPorcentaje = data.percentage;

            const _results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                .filter((hit) => {
                    const pacienteElastic = hit._source;
                    const pacDto = {
                        documento: data.documento ? data.documento.toString() : '',
                        nombre: data.nombre ? data.nombre : '',
                        apellido: data.apellido ? data.apellido : '',
                        fechaNacimiento: data.fechaNacimiento ? moment(data.fechaNacimiento).format('YYYY-MM-DD') : '',
                        sexo: data.genero ? data.genero.toLowerCase() : ''
                    };
                    const pacElastic = {
                        documento: pacienteElastic.documento ? pacienteElastic.documento.toString() : '',
                        nombre: pacienteElastic.nombre ? pacienteElastic.nombre : '',
                        apellido: pacienteElastic.apellido ? pacienteElastic.apellido : '',
                        fechaNacimiento: pacienteElastic.fechaNacimiento ? moment(pacienteElastic.fechaNacimiento).format('YYYY-MM-DD') : '',
                        sexo: pacienteElastic.sexo ? pacienteElastic.sexo : ''
                    };
                    const match = new Matching();
                    const valorMatching = match.matchPersonas(pacElastic, pacDto, weights, 'Levenshtein');
                    pacienteElastic['id'] = hit._id;
                    if (valorMatching >= config.mpi.cotaAppMobile) {
                        listaPacientesMax.push({
                            id: hit._id,
                            paciente: pacienteElastic,
                            match: valorMatching
                        });
                    }
                });

            const sortMatching = (a, b) => {
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
                PacienteApp.findOne({ email: data.email }, (err, acts) => {
                    if (!acts) {
                        resolveEmail();
                    } else {
                        rejectEmail({ email: 'account_exists' });
                    }
                });
            });
        }

        if (data.lastLogin) {
            account.lastLogin = data.lastLogin;
        }

        Promise.all([promise, promise_password]).then(() => {

            account.save((err) => {
                if (err) {
                    return reject(err);
                }
                resolve(account);
            });

        }).catch(reject);

    });
}

/**
 * Realiza un matching de los datos del paciente con el scan
 * @param {pacienteAppSchema} userAccount
 * @param {object} mpiData Datos del paciente para matching
 */
export function verificarCuenta(userAccount, mpiData) {
    return new Promise((resolve, reject) => {
        const pacienteId = userAccount.pacientes[0].id;
        controller.buscarPaciente(pacienteId).then((pac => {

            const match = new Matching();
            const resultadoMatching = match.matchPersonas(mpiData, pac.paciente, config.mpi.weightsScan, 'Levenshtein');

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

        userAccount.save((errSave, user) => {
            if (errSave) {
                return reject(errSave);
            }
            return resolve(user);
        });
    });
}

/**
 * Recupera todos los ID de pacientes que tienen la aplicación mobile activa
 */
export function getPatientIdEnabledAccounts() {
    return new Promise((resolve, reject) => {
        try {
            resolve(PacienteApp.find({ $and: [{ activacionApp: true }, { 'pacientes._id': { $exists: true } }] }, { _id: 0, 'pacientes.id': 1 }));
        } catch {
            reject(null);
        }
    });
}
