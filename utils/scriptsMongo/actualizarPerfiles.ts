import { AuthUsers } from '../../auth/schemas/authUsers';
import { Perfiles } from '../../modules/gestor-usuarios/perfil.schema';
import { Organization } from '@andes/fhir';
const shiroTrie = require('shiro-trie');

export const actualizarPerfiles = async (done) => {
    const organizaciones: any = AuthUsers.aggregate([
        {
            $project: {
                organizaciones: 1,
                id: '$_id'
            }
        },
        {
            $unwind: '$organizaciones'
        }
    ]).cursor({});
    const perfiles: any = await Perfiles.find({}, { permisos: 1, nombre: 1 });
    for await (const user of organizaciones) {
        const usuarioPermisos = shiroTrie.new();
        usuarioPermisos.add(user.organizaciones.permisos);
        for (let y = 0; y < perfiles.length; y++) {
            const longitudPerfil = perfiles[y].permisos.length;
            for (let i = 0; i < longitudPerfil; i++) {
                if (usuarioPermisos.check(perfiles[y].permisos[i])) {
                    if (i === longitudPerfil - 1) {
                        const perf: any = new Object();
                        perf._id = perfiles[y]._id;
                        perf.nombre = perfiles[y].nombre;
                        await AuthUsers.update(
                            { _id: user.id, 'organizaciones._id': user.organizaciones._id },
                            { $addToSet: { 'organizaciones.$.perfiles': perf } });
                    }
                } else {
                    i = longitudPerfil; // para que salga
                }
            }
        }
    }
    done();
};
