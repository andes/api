import { authUsers } from '../../../auth/schemas/permisos';


/**
 * Reemplaza los permisos de un usuario para un modulo determinado por los permisos dados
 *
 * @export
 * @param {*} idUsuario
 * @param {*} idOrganizacion
 * @param {*} modulo
 * @param {*} nuevosPermisos
 * @returns
 */
export async function actualizarPermisosUsuario(idUsuario, idOrganizacion, modulo, nuevosPermisos) {
    let usuario: any = await authUsers.findOne({ _id: idUsuario });
    let organizacionPermisos = usuario.organizaciones.find(o => o._id.toString() === idOrganizacion);
    if (!organizacionPermisos) {
        usuario.organizaciones.push({ _id: idOrganizacion, permisos: nuevosPermisos }); // TODO: agregar ', activo: true' cuando se mergee el nuevo gestor de usuarios
    } else {
        organizacionPermisos.permisos = organizacionPermisos.permisos ?
            organizacionPermisos.permisos.filter(p => p.indexOf(modulo)).concat(nuevosPermisos) : nuevosPermisos;
    }
    return await usuario.save();
}
