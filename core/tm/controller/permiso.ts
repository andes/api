import { authUsers } from '../../../auth/schemas/permisos';
import { Types } from 'mongoose';


/**
 *
 *
 * @export
 * @param {*} done
 */
export async function actualizarPermisosUsuario(idUsuario, idOrganizacion, modulo, nuevosPermisos) {
    let usuario: any = await authUsers.findOne({ _id: idUsuario });
    let organizacionPermisos = usuario.organizaciones.find(o => o._id.toString() === Types.ObjectId(idOrganizacion).toString());

    if (!organizacionPermisos) {
        usuario.organizaciones.push({ _id: idOrganizacion, permisos: nuevosPermisos }); // TODO: agregar ', activo: true' cuando se mergee el nuevo gestor de usuarios
    } else {
        organizacionPermisos.permisos = organizacionPermisos.permisos ?
            organizacionPermisos.permisos.filter(p => p.indexOf(modulo) !== 0).concat(nuevosPermisos) : nuevosPermisos;
    }

    return await usuario.save();
}
