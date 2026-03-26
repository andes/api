import { AndesCache, CustomError, ObjectId } from '@andes/core';
import * as mongoose from 'mongoose';
import { enviarMail, RedisWebSockets } from '../config.private';
import { Organizacion } from '../core/tm/schemas/organizacion';
import { APP_DOMAIN, userScheduler } from './../config.private';
import { Profesional } from './../core/tm/schemas/profesional';
import { MailOptions, renderHTML, sendMail } from './../utils/roboSender/sendEmail';
import { Auth } from './auth.class';
import { AuthUsers } from './schemas/authUsers';
import * as crypto from 'crypto';
const sha1Hash = require('sha1');


export let AuthCache: AndesCache;

if (RedisWebSockets.active) {
    AuthCache = new AndesCache({ adapter: 'redis', port: RedisWebSockets.port, host: RedisWebSockets.host });
} else {
    AuthCache = new AndesCache({ adapter: 'memory' });
}

/**
 * Envuelve una promesa con un tiempo límite.
 * @param {Promise<T>} promise La promesa a la que se aplicará el timeout.
 * @param {number} ms El tiempo límite en milisegundos.
 * @param {string} errorMsg Mensaje de error para el timeout.
 * @returns {Promise<T>} Una promesa que se resuelve con el resultado de la promesa original o se rechaza por timeout.
 */
function timeoutPromise(promise, ms, errorMsg = 'Timeout') {
    const timeout = new Promise((_, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(errorMsg));
        }, ms);
    });
    return Promise.race([
        promise,
        timeout
    ]);
}

/**
 * Genera los datos de sesion de un usuarios.
 * Son los que antes viajaban en el token.
 */

export function createPayload(user, authOrg, prof) {
    const nombre = (prof && prof.nombre) || user.nombre;
    const apellido = (prof && prof.apellido) || user.apellido;
    const pacienteRestringido = (prof && prof.pacienteRestringido) || user.pacienteRestringido;
    return {
        pacienteRestringido,
        usuario: {
            id: String(user._id),
            nombreCompleto: nombre + ' ' + apellido,
            nombre,
            apellido,
            username: user.usuario,
            documento: user.usuario
        },
        organizacion: {
            _id: String(authOrg._id),
            id: String(authOrg._id),
            nombre: authOrg.nombre
        },
        profesional: prof && String(prof._id),
        permisos: [...user.permisosGlobales, ...authOrg.permisos],
        fechaVencimiento: authOrg.fechaVencimiento,
        feature: { ...(user.configuracion || {}) }
    };
}

/**
 * Busca las collecciones necesarias para generar el payload de session.
 */
export async function findTokenData(username: number, organizacion: ObjectId) {
    const pAuth = AuthUsers.findOne({ usuario: username, 'organizaciones._id': organizacion });
    const pProfesional = Profesional.findOne({ documento: String(username), habilitado: { $ne: false } }, { nombre: true, apellido: true });
    const [auth, prof]: [any, any] = await Promise.all([pAuth, pProfesional]);
    if (auth) {
        await checkAndInactivateExpired(auth);
        const authOrganizacion = auth.organizaciones.find(item => String(item._id) === String(organizacion));
        return {
            usuario: auth,
            organizacion: authOrganizacion,
            profesional: prof
        };
    }
    return null;
}

/**
 * Genera el payload de session y lo cachea.
 */

export async function generateTokenPayload(username, organizacion: ObjectId, account_id) {
    const data = await findTokenData(username, organizacion);
    if (data.usuario) {
        const tokenPayload = createPayload(data.usuario, data.organizacion, data.profesional);
        const token = Auth.generateUserToken2(username, organizacion, account_id);

        await AuthCache.set(token, tokenPayload, 60 * 60 * 24);

        return { token, payload: tokenPayload };
    } else {
        return null;
    }
}

/**
 * Recupera los datos extras del TOKEN. Utiliza la cache para rápido acceso.
 */

export async function getTokenPayload(token, userData) {
    const payload = await AuthCache.get(token);
    if (payload) {
        return payload;
    }
    const data = await findTokenData(userData.usuario, userData.organizacion);
    const tokenPayload = createPayload(data.usuario, data.organizacion, data.profesional);

    return tokenPayload;
}

/**
 * Recupera los datos necesarios de un Usuario.
 * User y Profesional
 */

export async function findUser(username) {
    const pAuth = AuthUsers.findOne({ usuario: username });
    const pProfesional = Profesional.findOne({ documento: username, habilitado: { $ne: false } }, { matriculas: true, especialidad: true });
    const [auth, prof] = await Promise.all([pAuth, pProfesional]);
    if (auth) {
        await checkAndInactivateExpired(auth);
        return {
            user: auth,
            profesional: prof
        };
    }
    return null;
}

/**
 * Chequea las organizaciones del usuario e inactiva las que tienen fecha de vencimiento cumplida.
 * @param {any} user Instancia de AuthUsers
 */
export async function checkAndInactivateExpired(user) {
    let changed = false;
    const now = new Date();
    user.organizaciones.forEach(org => {
        if (org.activo && org.fechaVencimiento && org.fechaVencimiento < now) {
            org.activo = false;
            changed = true;
        }
    });
    if (changed) {
        user.audit(userScheduler);
        await user.save();
    }
}

export async function updateUser(documento, nombre, apellido, password) {
    return await AuthUsers.findOneAndUpdate(
        { usuario: documento },
        { password, nombre, apellido, lastLogin: new Date() },
    );
}

export async function updateOrganizacion(usuario, idOrg) {
    const org = usuario.user.organizaciones.find(organizacion => idOrg.toString() === organizacion._id.toString());
    org.lastLogin = new Date();
    return await AuthUsers.update({ _id: usuario.user._id }, { $set: { organizaciones: usuario.user.organizaciones } });
}

// Función interna que chequea si la cuenta mobile existe
export const checkMobile = (profesionalId) => {
    return new Promise((resolve, reject) => {
        const authMobile = require('../modules/mobileApp/controller/AuthController');
        authMobile.getAccountByProfesional(profesionalId).then((account) => {
            if (!account) {
                Profesional.findById(profesionalId).then(prof => {
                    if (!prof) {
                        return reject();
                    }
                    authMobile.createUserFromProfesional(prof).then((account2) => {
                        resolve(account2);
                    }).catch(reject);
                });
                return;
            }
            resolve(account);
        }).catch(() => {
            reject();
        });
    });
};


/**
 * Envía un link para recuperar la contraseña en caso qeu sea un usuario temporal con email (fuera de onelogin).
 * AuthUser
 */
export async function setValidationTokenAndNotify(username) {
    const EMAIL_TIMEOUT_MS = 5000;
    try {
        const usuario = await AuthUsers.findOne({ usuario: username });
        if (usuario && usuario.tipo === 'temporal' && usuario.email) {
            usuario.validationToken = new mongoose.Types.ObjectId().toHexString();
            usuario.audit(userScheduler);
            await usuario.save();

            const extras: any = {
                titulo: 'Recuperación de contraseña',
                usuario,
                url: `${APP_DOMAIN}/auth/resetPassword/${usuario.validationToken}`,
            };
            const htmlToSend = await renderHTML('emails/recover-password.html', extras);

            const options: MailOptions = {
                from: enviarMail.auth.user,
                to: usuario.email.toString(),
                subject: 'Recuperación de contraseña',
                text: '',
                html: htmlToSend,
                attachments: null
            };
            try {
                await timeoutPromise(
                    sendMail(options),
                    EMAIL_TIMEOUT_MS,
                    'El servicio de correo superó el tiempo límite (timeout).'
                );
            } catch (mailError) {
                return null;
            }
            return usuario;
        } else {
            // El usuario no existe o es de gobierno => debe operar por onelogin
            return null;
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Envía un codigo OTP para recuperar la contraseña en caso que sea un usuario temporal con email (fuera de onelogin).
 * AuthUser
 */
export async function sendOtpAndNotify(username): Promise<any> {
    try {
        const usuario = await AuthUsers.findOne({ usuario: username });

        // Se mantiene la validación para usuarios temporales con email
        if (usuario && usuario.tipo === 'temporal' && usuario.email) {
            // Genera un código OTP de 6 dígitos
            const otpCode = crypto.randomInt(100000, 999999).toString();

            usuario.otp = {
                code: otpCode,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 10 minutos en milisegundos
            };

            usuario.audit(userScheduler);
            await usuario.save();

            const extras: any = {
                titulo: 'Código de Verificación',
                usuario,
                otpCode,
            };
            const htmlToSend = await renderHTML('emails/otp-code.html', extras);

            const options: MailOptions = {
                from: enviarMail.auth.user,
                to: usuario.email.toString(),
                subject: 'Tu código de verificación',
                text: '',
                html: htmlToSend,
                attachments: null,
            };
            await sendMail(options);
            return usuario;
        } else {
            // El usuario no existe o no es un usuario temporal con email
            return null;
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Valida el código OTP ingresado por el usuario y actualiza su contraseña
 * @param username - El nombre de usuario o correo electrónico.
 * @param otpCode - El código OTP que el usuario ha ingresado.
 * @param newPassword - La nueva contraseña a setear
 */
export async function validateOtpAndResetPassword(username, otpCode, newPassword) {
    try {
        const usuario = await AuthUsers.findOne({ usuario: username });
        if (!usuario || !usuario.otp || !usuario.otp.code) {
            return false;
        }
        const now = new Date();
        if (
            usuario.otp.code !== otpCode.toString() ||
            usuario.otp.expiresAt < now
        ) {
            return false;
        }
        usuario.password = sha1Hash(newPassword);
        // limpiar otpCode del usuario
        usuario.otp.code = null;
        usuario.otp.expiresAt = null;
        usuario.audit(userScheduler);
        await usuario.save();
        return true;
    } catch (error) {
        throw new CustomError(error, 500);
    }
}

/**
 * Busca el usuario que corresponde con el validationToken y si lo encuentra permite el reset de la contraseña.
 * AuthUser
 */
export async function reset(token, password) {
    try {
        const usuario = await AuthUsers.findOne({ validationToken: token });
        if (usuario) {
            usuario.validationToken = null;
            usuario.password = sha1Hash(password);
            usuario.audit(userScheduler);
            await usuario.save();
            return usuario;
        } else {
            // No existe usuario con el token buscado
            return null;
        }
    } catch (error) {
        throw new CustomError(error, 500);
    }
}

export async function updateUserPermisos(req) {
    const user: any = await AuthUsers.findOne({ _id: req.params.usuario });

    const permisos = getPermisosByType(req.body.tipoPermisos);

    if (permisos && permisos.length) {
        const organizacionPermisos = user.organizaciones;
        if (organizacionPermisos && organizacionPermisos.length) {
            permisos.forEach(e => {
                organizacionPermisos.forEach(op => {
                    if (!op.permisos.find(e2 => e2 === e)) {
                        op.permisos.push(e);
                    }
                });
            });
        } else {
            const organizacion = await Organizacion.findOne({ matriculacion: true });
            user.organizaciones = [{
                _id: organizacion._id,
                nombre: organizacion.nombre,
                permisos
            }];
        }
        Auth.audit(user, req);
        return await user.save();
    }
}

export async function createUser(data) {
    const user = new AuthUsers();
    user.usuario = data.documento;
    user.documento = data.documento;
    user.activo = true;
    user.nombre = data.nombre;
    user.apellido = data.apellido;
    user.email = data.email;
    user.authMethod = data.authMethod;
    user.tipo = data.tipo;

    const organizacion = await Organizacion.findOne({ matriculacion: true });
    const permisos = getPermisosByType(data.tipoPermisos);
    const organizaciones = [{
        _id: organizacion._id,
        nombre: organizacion.nombre,
        activo: true,
        permisos,
        perfiles: [],
        lastLogin: new Date()
    }];
    user.organizaciones = organizaciones;

    user.audit(userScheduler);
    return await user.save();
}

export async function getTemporyTokenGenerarUsuario(username) {
    const organizacion = await Organizacion.findOne({ matriculacion: true });
    const permisos = getPermisosByType('generarUsuario');
    return Auth.generateUserTokenTemporaly(username, permisos, organizacion._id);
}

function getPermisosByType(tipoPermisos) {
    let permisos;
    if (tipoPermisos === 'certificadosCovid19') {
        permisos = ['mpi:paciente:getbyId', 'rup:tipoPrestacion:604793e28566033a409007ea'];
    } else if (tipoPermisos === 'generarUsuario') {
        permisos = ['usuarios:read', 'usuarios:write', 'matriculaciones:profesionales:putProfesional', 'log:post'];
    }
    return permisos;
}

export async function findUsersByUsername(usernames) {
    return await AuthUsers.find({ usuario: { $in: usernames } });
}
