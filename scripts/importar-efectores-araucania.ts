import { AreaAraucania } from '../core/tm/schemas/areaAraucania';

const fsp = require('fs/promises');
const fileAreaAraucania = ''; // agregar ubicacion de archivo

async function run(done) {
    const data = await fsp.readFile(fileAreaAraucania, { encoding: 'utf8' });
    const array: string[] = data.split(/\r?\n/);
    for (let i = 1; i < array.length; i++) {
        try {
            const row: string[] = array[i].split(';');
            const efector = {
                longitud: row[0].includes('.') ? row[0] : row[0].substring(0, 3) + '.' + row[0].substring(3, row[0].length),
                latitud: row[1].includes('.') ? row[1] : row[1].substring(0, 3) + '.' + row[1].substring(3, row[1].length),
                nombre: row[2],
                region: row[3],
                comunidad: row[4],
                complejidad: row[5],
                direccion: row[6],
                telefono: row[7]
            };
            await AreaAraucania.create(efector);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        }
    }
    done();
}

export = run;
