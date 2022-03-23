import { AuthUsers, IAuthUsersDoc } from '../auth/schemas/authUsers';
import { ConceptosTurneablesCtr } from '../core/tm/conceptos-turneables.routes';
import { userScheduler } from '../config.private';

async function run(done) {
    const concepts = await ConceptosTurneablesCtr.search({});
    const cursor = await AuthUsers.find({}).cursor({ batchSize: 100 });
    const updateUsuario = async (usuario: IAuthUsersDoc) => {
        try {
            usuario.organizaciones.forEach(org => {
                const permisosNew = [];
                const ids = []; // ids de conceptos
                org.permisos.forEach(permiso => {
                    if (permiso.slice(0, 19) === 'rup:tipoPrestacion:') {
                        ids.push(permiso.slice(19, permiso.length));
                    } else {
                        permisosNew.push(permiso);
                    }
                });
                // se mapean los ids para generar los nuevos permisos en funcion de conceptIds
                ids.forEach(id => {
                    /* const conceptId (aclaracion): si el mapeo no existe puede que el permiso ya este configurado como conceptId.
                       En este caso lo insertamos como estaba para evitar sobrescribir como undefined */
                    const conceptId = concepts.find(c => {
                        const _idString = (c._id).toString();
                        return _idString === id;
                    })?.conceptId || id;

                    if (!permisosNew.find(c => c === `rup:tipoPrestacion:${conceptId}`)) {
                        permisosNew.push(`rup:tipoPrestacion:${conceptId}`);
                    }
                });
                org.permisos = permisosNew;
            });
            usuario.audit(userScheduler);
            await usuario.save();
        } catch (err) {
            return;
        }
    };

    await cursor.eachAsync(async (uss) => {
        await updateUsuario(uss);
    });

    done();
}

export = run;
