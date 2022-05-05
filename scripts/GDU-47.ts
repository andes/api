import { AuthUsers } from '../auth/schemas/authUsers';

// script para quitar permisos del punto de inicio de internación en todos los usuarios
async function run(done) {
    const actualizarUsuarios = [];
    const permiso = 'internacion:inicio';
    const usuarios = AuthUsers.find({ 'organizaciones.permisos': permiso }).cursor({ batchSize: 100 });

    for await (const usuario of usuarios) {
        const organizacionesFiltradas = usuario.organizaciones.filter(org => org.permisos.includes(permiso) && !org.id.toString().includes('57e9670e52df311059bc8964'));
        organizacionesFiltradas.forEach(o => o.permisos = [...o.permisos.filter(p => p !== permiso)]);
        actualizarUsuarios.push(AuthUsers.update({ _id: usuario._id }, { $set: { organizaciones: usuario.organizaciones } }));
    }
    await Promise.all(actualizarUsuarios);
    done();
}

export = run;
