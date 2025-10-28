import { Organizacion } from '../core/tm/schemas/organizacion';
import { AuthUsers } from '../auth/schemas/authUsers';
async function run(done) {
    try {
        const usuariosSinNombreOrganizacion = await AuthUsers.aggregate([
            {
                $match: {
                    'organizaciones._id': { $exists: true },
                    $or: [
                        { 'organizaciones.nombre': { $exists: false } },
                        { 'organizaciones.nombre': null },
                        { 'organizaciones.nombre': '' }
                    ]
                }
            }
        ]);
        for (const usuario of usuariosSinNombreOrganizacion) {
            for (const org of usuario.organizaciones) {
                if (org._id && !org.nombre) {
                    const organizacionEncontrada = await Organizacion.findById(org._id, { nombre: 1 });
                    if (organizacionEncontrada?.nombre) {
                        await AuthUsers.updateOne(
                            {
                                _id: usuario._id,
                                'organizaciones._id': org._id
                            },
                            {
                                $set: {
                                    'organizaciones.$.nombre': organizacionEncontrada.nombre
                                }
                            }
                        );
                    }
                }
            }
        }
    } catch (error) {
        done(error);
    }
    done();
}
