import { AndesCache, ObjectId } from '@andes/core';
import { RedisWebSockets } from '../config.private';
import { Auth } from './auth.class';
import { AuthUsers } from './schemas/authUsers';
import { profesional } from './../core/tm/schemas/profesional';


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
        profesional: String(prof && prof._id),
        permisos: [...user.permisosGlobales, ...authOrg.permisos]
    };
}

/**
 * Busca las collecciones necesarias para generar el payload de session.
 */
export async function findTokenData(username: string, organizacion: ObjectId) {
    const pAuth = AuthUsers.findOne({ usuario: username, 'organizaciones._id': organizacion });
    const pProfesional = profesional.findOne({ documento: username }, { nombre: true, apellido: true });
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
    const pProfesional = profesional.findOne({ documento: username }, { matriculas: true, especialidad: true });
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
                profesional.findById(profesionalId).then(prof => {
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
