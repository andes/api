import entidadFormadora = require('../modules/matriculaciones/schemas/entidadFormadora');

const fsp = require('fs/promises');
const fileEntidadFormadora = '../api/modules/matriculaciones/csv/entidadesFormadoras.csv';

async function run(done) {
    const dataEntidadFormadora = await fsp.readFile(fileEntidadFormadora, { encoding: 'utf8' });
    const dataEntidadArray: string[] = dataEntidadFormadora.split(/\r?\n/);
    for (let i = 1; i < dataEntidadArray.length; i++) {
        try {
            const rowEntidadFormadora: string[] = dataEntidadArray[i].split(',');
            const codigo = rowEntidadFormadora[0];
            const nombre = rowEntidadFormadora[1];
            const entidadFind: any = await entidadFormadora.findOne({ codigo });
            const entidad = {
                codigo,
                nombre,
                provincia: rowEntidadFormadora[2],
                habilitado: rowEntidadFormadora[8] === 'SI' ? true : false
            };
            if (entidadFind) {
                if (nombre !== entidadFind.nombre) {
                    await entidadFormadora.findByIdAndUpdate(entidadFind._id, entidad);
                }
            } else {
                await entidadFormadora.create(entidad);
            }
        } catch (err) {
            done(err);
        }
    }
    done();
}

export = run;
