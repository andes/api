import { Puco, IPuco } from '../schemas/puco';
import { ObraSocial } from '../schemas/obraSocial';
import { sisa } from './../../../config.private';
import { EventCore } from '@andes/event-bus';
import moment = require('moment');
import { handleHttpRequest } from '../../../utils/requestHandler';
import { obraSocialLog } from '../../../modules/obraSocial/obraSocialLog';

// obtiene las versiones de todos los padrones cargados
export async function obtenerVersiones() {
    if (!checkConnection()) {
        return [];
    }
    let versiones = await Puco.distinct('version').exec();  // esta consulta obtiene un arreglo de strings
    for (let i = 0; i < versiones.length; i++) {
        versiones[i] = { version: versiones[i] };
    }
    versiones.sort((a, b) => compare(a.version, b.version));
    return versiones;
}

export async function pacientePuco(documento) {
    let resultOS = [];
    const osPuco = await getOSPuco(documento);
    if (osPuco.length > 0) {
        // genera un array con todas las obras sociales para una version de padron dada
        for (let i = 0; i < osPuco.length; i++) {
            const obraSocial = await ObraSocial.findOne({ codigoPuco: osPuco[i].codigoOS });
            if (!obraSocial) {
                obraSocialLog.error('find', { codigoPuco: osPuco[i].codigoOS }, null);
            }
            resultOS[i] = {
                codigoPuco: osPuco[i].codigoOS,
                nombre: obraSocial?.nombre || '',
                financiador: obraSocial?.nombre || ''
            };
        }
    }
    return resultOS;
}


/**
 * obtenemos el paciente de la coleccion de puco
 * periodo es optativo, si no se envía se considera el ultimo periodo que contenga el paciente
 * si el último periodo que contiene el paciente no está actualizado, entonces se lo actualiza con sisa
 */
export async function getOSPuco(documento, periodo = null) {
    if (!checkConnection()) {
        // varificamos si hay conexion con puco
        return [];
    }
    const lastVersion = moment().add(-1, 'month').startOf('month').format('YYYY-MM-DD'); // primer día del mes anterior
    const dni = Number.parseInt(documento, 10) || 0;
    let osPatientPuco: IPuco[] = [];
    let padron: any = lastVersion; // contiene el periodo de la os a retornar
    let lastVersionPuco;
    if (periodo) {
        padron = periodo;
        osPatientPuco = await Puco.find({ dni, version: padron });
    } else {
        // si periodo no trae datos utilizamos el ultimo padron cargado al paciente
        const osVersiones: IPuco[] = await Puco.find({ dni });
        if (osVersiones.length) {
            osVersiones.sort((a, b) => compare(a.version, b.version));
            lastVersionPuco = osVersiones[0].version; // ultima actualizacion que contiene el paciente en puco
            osPatientPuco = osVersiones.filter(os => compare(os.version, lastVersionPuco) === 0);

        }
    }
    const lastPeriodo = (p: any) => (compare(p, lastVersion) === 0);

    // si se consulto por la ultima version y paciente no está en la BD de puco, con la ultima version lo actualizamos
    if (lastPeriodo(padron) && (!osPatientPuco.length ||
        (osPatientPuco.length && !lastPeriodo(lastVersionPuco)))) {
        // obtenemos de sisa
        EventCore.emitAsync('os:puco:create', dni);

    }
    return osPatientPuco;
}

EventCore.on('os:puco:create', async (documento) => {
    let respSisa: IPuco[] = await sisaPuco(documento); // consultamos a sisa el padron de Puco
    if (respSisa.length) {
        // filtramos objetos repetidos (solo cambia en la obra social: codigoOS)
        respSisa = respSisa.filter((os: IPuco, index) => {
            return index === respSisa.findIndex(osFind => (osFind.codigoOS === os.codigoOS));
        });
        respSisa.forEach(async (osPuco: IPuco) => {
            await createPatientPuco(osPuco);
        });
    }
});


export async function createPatientPuco(data) {
    const patientPuco: any = new Puco(data);
    try {
        await patientPuco.save();
        return patientPuco;
    } catch (error) {
        return error;
    }
}

/**
 * Busca en SISA las obras sociales de un ciudadano según Documento (exportados de PUCO Nación)
 *  Parámetros de la llamada
    Usuario: usuario
    Clave: clave
    Número de documento: nrodoc
 */
export async function sisaPuco(documento) {
    let respPuco: IPuco[] = [];
    try {
        if (documento) {
            const url = ` https://${sisa.host}/sisa/services/rest/puco/${documento}`;
            const params = { usuario: sisa.username, clave: sisa.password };
            const options = {
                method: 'POST',
                uri: url,
                body: params,
                json: true,
                timeout: 50000,
            };
            const response = await handleHttpRequest(options);
            if (response[0] >= 200 && response[0] < 400) {
                const resp = JSON.parse(JSON.stringify(response[1]));
                const { resultado, puco } = resp;
                if (resultado === 'OK') {
                    respPuco = puco.map(osPatient => {
                        const version = moment().add(-1, 'month').startOf('month').format('YYYY-MM-DD');
                        return {
                            tipoDoc: osPatient.tipodoc,
                            dni: Number.parseInt(osPatient.nrodoc, 10),
                            codigoOS: Number.parseInt(osPatient.rnos, 10),
                            transmite: 'N',
                            nombre: osPatient.denominacion,
                            version
                        };

                    });
                    return respPuco;
                }
            }
        }
    } catch (error) {
        return error;
    }
    return respPuco;
}


// Compara fechas. Junto con el sort ordena los elementos de mayor a menor.
function compare(a, b) {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return (dateA > dateB) ? -1 : (dateA < dateB) ? 1 : 0;
}

// Retorna true si hay conexion con DB De padrones
function checkConnection() {
    return Puco.db.readyState > 0;
}
