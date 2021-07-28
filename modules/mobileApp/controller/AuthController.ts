import { IPacienteAppDoc, PacienteApp } from '../schemas/pacienteApp';
import { Matching } from '@andes/match';
import * as config from '../../../config';
import * as mongoose from 'mongoose';
import * as debug from 'debug';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { sendEmail, IEmail, ISms, sendSms } from '../../../utils/roboSender';
import { IPushNotification, sendPushNotification } from './PushClientFCM';

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
        subject: 'ANDES - Restablecer contraseña app móvil',
        template: 'emails/reset-password.html',
        extras: replacements,
        plainText: 'El código de verificación para restaurar su contraseña es: ' + user.restablecerPassword.codigo,
    };

    // enviamos email
    sendEmail(mailOptions);

    const sms: ISms = {
        message: 'El código de verificación para restaurar su contraseña es: ' + user.restablecerPassword.codigo,
        phone: user.telefono
    };

    sendSms(sms);

}

export async function enviarCodigoVerificacion(user, password, device_fcm_token?) {

    const replacements = {
        username: user.apellido + ', ' + user.nombre,
        userEmail: user.email,
        codigo: password,
        action: 'codigoVerificacion'
    };

    // Email
    const mailOptions: IEmail = {
        email: user.email,
        subject: 'ANDES - Código de Activación app móvil',
        template: 'emails/active-app-code.html',
        extras: replacements,
        plainText: `
        Hola ${replacements.username}, este es su código de activación para ANDES app móvil: ${password}.\n
        Recordá que el mismo vence en 24 horas.\n
        Por cualquier problema escribinos a info@andes.gob.ar
        `,
    };

    // Enviamos email
    sendEmail(mailOptions);

    if (device_fcm_token) {

        // Notificación Push
        const notification: IPushNotification = {
            title: '¡Bienvenido/a a Andes!',
            body: `Tu código de verificación es ${password}. Tocá esta notificación para completar tu registro.`,
            extraData: replacements
        };

        // Enviamos notificación Push
        const device = [
            { device_fcm_token }
        ];
        await sendPushNotification(device, notification);
    }

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
 * Actualiza los datos de la cuenta mobile
 * @param data {object} password, email, telefono
 */

export function updateAccount(account: IPacienteAppDoc, data) {
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
                        return resolvePassword(true);
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
                        resolveEmail(true);
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
export async function verificarCuenta(userAccount, mpiData) {
    const pacienteId = userAccount.pacientes[0].id;
    const paciente = PacienteCtr.findById(pacienteId);
    const match = new Matching();
    const resultadoMatching = match.matchPersonas(mpiData, paciente, config.mpi.weightsScan, 'Levenshtein');

    // no cumple con el numero del matching
    return resultadoMatching >= config.mpi.cotaMatchMax;
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
