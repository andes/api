import { AndesCache, CustomError, ObjectId } from '@andes/core';
import { RedisWebSockets, enviarMail } from '../config.private';
import { Auth } from './auth.class';
import { AuthUsers } from './schemas/authUsers';
import { userScheduler } from './../config.private';
import { Profesional } from './../core/tm/schemas/profesional';
import * as mongoose from 'mongoose';
import { APP_DOMAIN } from './../config.private';
import { sendMail, renderHTML, MailOptions } from './../utils/roboSender/sendEmail';
const sha1Hash = require('sha1');


export let AuthCache: AndesCache;

if (RedisWebSockets.active) {
    AuthCache = new AndesCache({ adapter: 'redis', port: RedisWebSockets.port, host: RedisWebSockets.host });
} else {
    AuthCache = new AndesCache({ adapter: 'memory' });
}

/**
 * Genera los datos de sesion de un usuarios.
 * Son los que antes viajaban en el token.
 */

export function createPayload(user, authOrg, prof) {
    const nombre = (prof && prof.nombre) || user.nombre;
    const apellido = (prof && prof.apellido) || user.apellido;
    return {
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
        feature: { ...(user.configuracion || {}) }
    };
}

/**
 * Busca las collecciones necesarias para generar el payload de session.
 */
export async function findTokenData(username: number, organizacion: ObjectId) {
    const pAuth = AuthUsers.findOne({ usuario: username, 'organizaciones._id': organizacion });
    const pProfesional = Profesional.findOne({ documento: username }, { nombre: true, apellido: true });
    const [auth, prof]: [any, any] = await Promise.all([pAuth, pProfesional]);
    if (auth) {
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
    const pProfesional = Profesional.findOne({ documento: username }, { matriculas: true, especialidad: true });
    const [auth, prof] = await Promise.all([pAuth, pProfesional]);
    if (auth) {
        return {
            user: auth,
            profesional: prof
        };
    }
    return null;
}


export async function updateUser(documento, nombre, apellido, password) {
    return await AuthUsers.findOneAndUpdate(
        { usuario: documento },
        { password, nombre, apellido, lastLogin: new Date() },
    );
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
    try {
        let usuario = await AuthUsers.findOne({ usuario: username });
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
            await sendMail(options);
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
 * Busca el usuario que corresponde con el validationToken y si lo encuentra permite el reset de la contraseña.
 * AuthUser
 */
export async function reset(token, password) {
    try {
        let usuario = await AuthUsers.findOne({ validationToken: token });
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
