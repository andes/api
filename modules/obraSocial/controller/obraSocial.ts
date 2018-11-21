import { Puco } from '../schemas/puco';

async function obtenerVersiones() {
    let versiones = await Puco.distinct('version').exec();  // esta consulta obtiene un arreglo de strings
    for (let i = 0; i < versiones.length; i++) {
        versiones[i] = { version: versiones[i] };
    }
    versiones.sort((a, b) => compare(a.version, b.version));
    return versiones;
}

function compare(a, b) {
    if (new Date(a) > new Date(b)) {
        return -1;
    }
    if (new Date(a) < new Date(b)) {
        return 1;
    }
    return 0;
}

export async function mapeoPuco(dni) {

    let padron;
    padron = await obtenerVersiones();   // trae las distintas versiones de los padrones
    padron = padron[0].version;
    let salida = await Puco.findOne({ dni, version: padron }, {}, (err, data: any) => { });
    console.log(salida);

    return salida;
}

