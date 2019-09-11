import { authUsers } from './schemas/permisos';
import { profesional } from './../core/tm/schemas/profesional';
import * as authMobile from '../modules/mobileApp/controller/AuthController';


export async function findUser(username) {
    const pAuth = authUsers.findOne({ usuario: username });
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
    return await authUsers.findOneAndUpdate(
        { usuario: documento },
        { password, nombre, apellido },
    );
}

// Función interna que chequea si la cuenta mobile existe
export const checkMobile = (profesionalId) => {
    return new Promise((resolve, reject) => {
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
