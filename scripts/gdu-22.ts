
import { AuthUsers } from '../auth/schemas/authUsers';

async function run(done) {
    const permiso = 'usuarios:*';
    const permisosUsuarios = ['usuarios:read',
                              'usuarios:write',
                              'usuarios:perfiles',
    ];
    const usuarios = AuthUsers.find({ 'organizaciones.permisos': permiso }).cursor({ batchSize: 200 });

    let usuario;
    while (usuario = await usuarios.next()) {
        usuario.organizaciones
            .filter(o => o.permisos.includes(permiso))
            .forEach(o => o.permisos = [...o.permisos.filter(p => p !== permiso), ...permisosUsuarios]);

        await AuthUsers.update({ _id: usuario._id }, { $set: { organizaciones: usuario.organizaciones } });
    }
    done();
}

export = run;
