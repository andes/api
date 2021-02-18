
import { AuthUsers, IAuthUsersDoc } from '../auth/schemas/authUsers';
const shiroTrie = require('shiro-trie');

async function run(done) {
    const usuarios = AuthUsers.find({}).cursor({ batchSize: 200 });

    let usuario: IAuthUsersDoc;
    while (usuario = await usuarios.next()) {

        for (const organizacion of usuario.organizaciones) {
            const shiro = shiroTrie.new();
            shiro.add(organizacion.permisos);

            if (shiro.permissions('turnos:agenda:?').length === 0) {
                if (shiro.permissions('turnos:planificarAgenda:?').length > 0) {
                    await AuthUsers.update(
                        { _id: usuario._id },
                        {
                            $push: {
                                'organizaciones.$[organizacion].permisos': 'turnos:agenda:read'
                            }
                        },
                        {
                            arrayFilters: [
                                {
                                    'organizacion._id': organizacion._id
                                }
                            ]
                        }
                    );

                }
            }

        }

    }
    done();
}

export = run;
