import { Modulos } from '../core/tm/schemas/modulos.schema';

async function run(done) {

    /**
     * Inserta collection "modulos_new"
     * Renombra collection "modulos" a "modulos_aux"
     * Renombra collection "modulos_new" a "modulos"
     * Elimina "modulos_aux" [DESACTIVADO]
     *
     * Datos generados con (se omite host auth):
     * mongoexport -h MONGO_HOST -d andes -c modulos -o modulos-new.json --jsonArray
     *
     */

    // "Módulos actual"
    const modulos = 'modulos';

    // Datos nuevos de "Módulos"
    const modulosNEW = 'modulos_new2';

    // Backup de "Módulos actual"
    const modulosAUX = 'modulos_aux';

    // Carga los datos
    const jsonRaw = require('./submodulos_json_data/modulos-new.json').map(x => {
        delete x._id;
        delete x.__v;
        if (x.submodulos && x.submodulos.length) {
            x.submodulos.map(y => { delete y._id; delete x.__v; return y; });
        }
        return x;
    });

    // Inserta los datos
    Modulos.db.collection(modulosNEW).insertMany(jsonRaw, async (err) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        } else {
            // Renombra actual a AUX
            await Modulos.db.collection(modulos).rename(modulosAUX);
            // Renombra nueva a actual
            await Modulos.db.collection(modulosNEW).rename(modulos);
            // await Modulos.db.dropCollection(modulosAUX);
            done();
        }
    });

}

export = run;
