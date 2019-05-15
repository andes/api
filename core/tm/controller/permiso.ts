import { authUsers } from '../../../auth/schemas/permisos';


/**
 * Reemplaza los permisos de un usuario para un módulo determinado por los permisos dados
 * Si se pasa en el módulo 'internacion', se quitarán todos los permisos que comiencen con
 * 'internacion' y se agregarán los nuevosPermisos del parámetro.
 * Si quisiera ser más específico, se puede pasar 'internacion:cama' como módulo y se dejarían todos
 * los permisos que se encuentran al mismo nivel.
 * @export
 * @param { string } idUsuario
 * @param { string } idOrganizacion
 * @param { string } modulo (key de los permisos)
 * @param { string[] } nuevosPermisos (arreglo de keys de permisos nuevos)
 * @returns
 */
export async function actualizarPermisosUsuario(idUsuario: string, idOrganizacion: string, modulo: string, nuevosPermisos: string[]) {
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
