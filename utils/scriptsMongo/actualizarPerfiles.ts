import { AuthUsers } from '../../auth/schemas/authUsers';
import { Perfiles } from '../../modules/gestor-usuarios/perfil.schema';
const shiroTrie = require('shiro-trie');

export const actualizarPerfiles = async (done) => {
    let organizaciones: any = await AuthUsers.aggregate([
        {
            $project: {
                organizaciones: 1,
                id: '$_id'
            }
        },
        {
            $unwind: '$organizaciones'
        }
    ]);
    for (let x = 0; x < organizaciones.length; x++) {
        let usuarioPermisos = shiroTrie.new();
        usuarioPermisos.add(organizaciones[x].organizaciones.permisos);
        let perfiles: any = await Perfiles.aggregate([
            {
                $project: {
                    nombre: 1,
                    id: '$_id',
                    permisos: 1,
                    longitud: { $size: '$permisos' }
                }
            }
        ]);
        for (let y = 0; y < perfiles.length; y++) {
            for (let i = 0; i < perfiles[y].longitud; i++) {
                if (usuarioPermisos.check(perfiles[y].permisos[i])) {
                    if (i === perfiles[y].longitud - 1) {
                        let perf: any = new Object();
                        perf._id = perfiles[y].id;
                        perf.nombre = perfiles[y].nombre;
                        await AuthUsers.update(
                            { _id: organizaciones[x].id, 'organizaciones._id': organizaciones[x].organizaciones._id },
                            { $addToSet: { 'organizaciones.$.perfiles': perf } });
                    }
                } else {
                    i = perfiles[y].longitud; // para que salga
                }
            }
        }
    }
    done();
};
