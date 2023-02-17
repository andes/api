import { Puco, IPuco } from '../schemas/puco';
import { IObraSocial, ObraSocial } from '../schemas/obraSocial';
import { busInteroperabilidad } from './../../../config.private';
import { EventCore } from '@andes/event-bus';
import { handleHttpRequest } from '../../../utils/requestHandler';
import { obraSocialLog } from '../../../modules/obraSocial/obraSocialLog';
import { createObraSocial } from '../controller/obraSocial';
import moment = require('moment');

// obtiene las versiones de todos los padrones cargados
export async function obtenerVersiones() {
    if (!checkConnection()) {
        return [];
    }
    const versiones = await Puco.distinct('version').exec(); // esta consulta obtiene un arreglo de strings
    for (let i = 0; i < versiones.length; i++) {
        versiones[i] = { version: versiones[i] };
    }
    versiones.sort((a, b) => compare(a.version, b.version));
    return versiones;
}

export async function pacientePuco(documento, sexo) {
    const resultOS = [];
    const osPuco = await getOSPuco(documento, sexo);
    if (osPuco.length > 0) {
        const ultimoTrimestre = moment().utc().subtract(3, 'M').startOf('month');

        if (!ultimoTrimestre.isAfter(osPuco[0].version)) {
            // genera un array con todas las obras sociales para una version de padron dada
            for (let i = 0; i < osPuco.length; i++) {
                const obraSocial = await ObraSocial.findOne({ codigoPuco: osPuco[i].codigoOS });
                if (!obraSocial) {
                    obraSocialLog.error('find', { codigoPuco: osPuco[i].codigoOS }, null);
                }
                resultOS[i] = {
                    codigoPuco: osPuco[i].codigoOS,
                    nombre: '',
                    financiador: ''
                };
                if (obraSocial) {
                    resultOS[i].nombre = obraSocial.nombre;
                    resultOS[i].financiador = obraSocial.nombre;
                }
            }
        }
    }
    return resultOS;
}

/**
 * obtenemos el paciente de la coleccion de puco
 * periodo es optativo, si no se envía se considera el ultimo periodo que contenga el paciente
 * si el último periodo que contiene el paciente no está actualizado, entonces se lo actualiza con sisa
 */
export async function getOSPuco(documento, sexo, periodo = null) {
    if (!checkConnection()) {
        // varificamos si hay conexion con puco
        return [];
    }
    const lastVersion = moment().startOf('month').format('YYYY-MM-DD'); // última version de la BD
    const dni = Number.parseInt(documento, 10) || 0;
    let osPatientPuco: IPuco[] = [];
    let padron: any = lastVersion; // contiene el periodo de la os a retornar
    let lastVersionPuco;
    if (periodo) {
        padron = periodo;
        osPatientPuco = await Puco.find({ dni, version: padron });
    } else {
        // si periodo no trae datos nos quedamos con el ultimo padron cargado al paciente
        const osVersiones: IPuco[] = await Puco.find({ dni });
        if (osVersiones.length) {
            osVersiones.sort((a, b) => compare(a.version, b.version));
            lastVersionPuco = osVersiones[0].version; // ultima actualizacion que contiene el paciente en puco
            osPatientPuco = osVersiones.filter(os => compare(os.version, lastVersionPuco) === 0);

        }
    }
    const lastPeriodo = (p: any) => (compare(p, lastVersion) === 0);

    // si se consultó por la ultima version y el paciente no está en puco con esa version,
    //  entonces lo actualizamos con sisa
    if (lastPeriodo(padron) && (!osPatientPuco.length ||
        (osPatientPuco.length && !lastPeriodo(lastVersionPuco)))) {
        // obtenemos de sisa
        EventCore.emitAsync('os:puco:create', dni, sexo);

    }
    return osPatientPuco;
}

EventCore.on('os:puco:create', async (documento, sexo) => {
    let obrasSociales: IPuco[] = await coberturaSalud(documento, sexo); // consultamos a sisa el padron de Puco
    if (obrasSociales.length > 0) {
        // filtramos objetos repetidos (solo cambia en la obra social: codigoOS)
        obrasSociales = obrasSociales.filter((os: IPuco, index) => {
            return index === obrasSociales.findIndex(osFind => (osFind.codigoOS === os.codigoOS));
        });
        obrasSociales.forEach(async (osPuco: IPuco) => {
            if (osPuco.coberturaSocial) {
                let obraSocial: IObraSocial = await ObraSocial.findOne({ codigoPuco: osPuco.codigoOS });
                if (!obraSocial) {
                    // si la OS no existe en la colección de ObraSocial => la insertamos
                    obraSocial = {
                        codigoPuco: osPuco.codigoOS,
                        nombre: osPuco.coberturaSocial
                    };
                    await createObraSocial(obraSocial);
                }
            }
            // insertamos la os del paciente en puco
            await createPuco(osPuco);
        });
    }
});


export async function createPuco(data) {
    delete data.coberturaSocial; // no se guarda el campo coberturaSocial en la coleccion de puco
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
export async function coberturaSalud(documento, sexo) {
    let respPuco: IPuco[] = [];
    try {
        const idSexo = sexo === 'femenino' ? 1 : 2;
        if (documento) {
            const token = await loginFederador();
            if (token) {
                const url = `${busInteroperabilidad.host}/personas/cobertura?nroDocumento=${documento}&idSexo=${idSexo}`;
                const options = {
                    url,
                    method: 'GET',
                    json: true,
                    headers: {
                        'Content-Type': 'application/json',
                        token,
                        codDominio: busInteroperabilidad.dominio
                    }
                };
                const [status, res] = await handleHttpRequest(options);
                if (status === 200) {
                    const obrasSociales = res;
                    respPuco = obrasSociales.map(osPatient => {
                        const version = moment().startOf('month').format('YYYY-MM-DD');
                        return {
                            tipoDoc: 'DNI',
                            dni: Number.parseInt(documento, 10),
                            codigoOS: Number.parseInt(osPatient.rnos, 10),
                            transmite: 'N',
                            nombre: '',
                            coberturaSocial: osPatient.cobertura || '',
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

/**
 * Obtiene el token de usuarios
 */

async function loginFederador() {
    const url = `${busInteroperabilidad.host}/usuarios/aplicacion/login`;
    const options = {
        url,
        method: 'POST',
        json: true,
        body: {
            nombre: busInteroperabilidad.usuario,
            clave: busInteroperabilidad.clave,
            codDominio: busInteroperabilidad.dominio
        },
    };
    const [status, body] = await handleHttpRequest(options);
    if (status === 200) {
        return body.token;
    }
    return null;
}
