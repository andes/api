import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { services } from '../../../services';
import { getSeccionClasificacion } from '../../../modules/forms/forms-epidemiologia/controller/forms-epidemiologia.controller';
import { sisaLog } from '../logger/sisaLog';
import { userScheduler } from '../../../config.private';
import moment = require('moment');
const logSisa = sisaLog.startTrace();


export async function altaEventoLAMP(ficha) {
    const orgCodigo: any = await Organizacion.findById(ficha.createdBy.organizacion.id, { codigo: 1 });
    const orgSisa = orgCodigo.codigo.sisa;
    const resAltaEvento = await altaEventoCovidPorFicha(ficha, orgSisa);
    if (resAltaEvento) {
        const { id_caso, resultado } = resAltaEvento;

        if (resultado === 'OK' && id_caso) {
            const resAltaMuestra = await altaMuestraCovidPorFicha(ficha, id_caso, orgSisa);
            if (resAltaMuestra.id) {
                altaDeterminacionCovid(getEventoIdFicha(ficha), resAltaMuestra.id, orgSisa);
            }
        }
    }
}

export async function altaEventoCovidPorFicha(ficha, idEstablecimientoCarga) {
    const seccionClasificacion = getSeccionClasificacion(ficha);
    const segundaclasificacion = seccionClasificacion?.fields.find(f => f.segundaclasificacion)?.segundaclasificacion.id;

    let result;

    let idClasificacionManualCaso;
    if (segundaclasificacion === 'confirmado') {
        idClasificacionManualCaso = 792;
    } else if (segundaclasificacion === 'antigeno') {
        idClasificacionManualCaso = 795;
    } else if (segundaclasificacion === 'lamp') {
        idClasificacionManualCaso = 754;
    }
    if (idClasificacionManualCaso) {
        const idEvento = getEventoIdFicha(ficha);
        const dtoEventoCasoNominal = {
            idTipodoc: '1',
            nrodoc: ficha.paciente.documento,
            sexo: ficha.paciente.sexo === 'femenino' ? 'F' : (ficha.paciente.sexo === 'masculino') ? 'M' : 'X',
            fechaNacimiento: moment(ficha.paciente.fechaNacimiento).format('DD-MM-YYYY'),
            idGrupoEvento: '113',
            idEvento,
            idEstablecimientoCarga,
            fechaPapel: moment(ficha.createdAt).format('DD-MM-YYYY'),
            idClasificacionManualCaso,
        };
        result = await altaEvento(dtoEventoCasoNominal);
    }

    return result;
}

export async function altaMuestraCovidPorFicha(ficha, idEvento, idEstablecimientoToma) {
    const seccionClasificacion = getSeccionClasificacion(ficha);
    const fechaMuestra = seccionClasificacion?.fields.find(f => f.fechamuestra)?.fechamuestra;

    const dtoMuestra = {
        adecuada: true,
        aislamiento: false,
        fechaToma: moment(fechaMuestra).format('YYYY-MM-DD'),
        idEstablecimientoToma,
        idEventoCaso: idEvento.toString(),
        idMuestra: '294', // Hisopado nasofaríngeo para métodos moleculares
        idtipoMuestra: '4', // Humano - espacios no estériles
        muestra: true
    };

    return altaMuestra(dtoMuestra);
}

export async function altaDeterminacionCovid(idEvento, idEventoMuestra, idEstablecimiento) {
    const dtoResultado = {
        derivada: false,
        fechaEmisionResultado: moment().format('YYYY-MM-DD'),
        fechaRecepcion: moment().format('YYYY-MM-DD'),
        idEstablecimiento,
        idEvento,
        idEventoMuestra,
        idPrueba: '1082', // Amplificacion isotermica
        idResultado: '109',
        idTipoPrueba: '727', // Genoma viral SARS-CoV-2
        noApta: true,
        valor: 'Confirmado por amplificación isotérmica'
    };
    return altaDeterminacion(dtoResultado);

}

export async function altaEvento(altaEventoCasoNominal) {
    let response = null;
    try {
        response = await services.get('SISA-WS400').exec({ altaEventoCasoNominal });
        if (response.resultado !== 'OK') {
            throw new Error(response.description || 'error export SISA ws400');
        }
        return response;
    } catch (e) {
        await logSisa.error('sisa:export:evento', { params: altaEventoCasoNominal, response }, e.message, userScheduler);
        return false;
    }
}

export async function altaEventoV2(altaEventoCasoNominal) {
    let response = null;

    try {
        response = await services.get('SISA-WS400-v2').exec({ altaEventoCasoNominal });

        if (response.status !== 'OK') {
            throw new Error(response.description || 'error export SISA ws400');
        }

        return response;
    } catch (e) {
        await logSisa.error('sisa:export:evento', { params: altaEventoCasoNominal, response }, e.message, userScheduler);

        return false;
    }
}

export async function altaMuestra(dtoMuestra) {
    let response = null;
    try {
        response = await services.get('SISA-WS75').exec(dtoMuestra);
        if (!response.id) {
            throw new Error('error export SISA ws75');
        }
        return response;
    } catch (e) {
        await logSisa.error('sisa:export:muestra', { params: dtoMuestra, response }, e.message, userScheduler);
        return false;
    }
}

export async function altaDeterminacion(dtoDeterminacion) {
    let response = null;
    try {
        response = await services.get('SISA-WS76').exec(dtoDeterminacion);
        // Log info solo para fines de monitoreo inicial. Borrar una vez puesto a punto
        await logSisa.info('sisa:export:determinacion', { params: dtoDeterminacion, response }, userScheduler);
        return response;
    } catch (e) {
        await logSisa.error('sisa:export:determinacion', { response }, e.message, userScheduler);
        return false;
    }
}

function getEventoIdFicha(ficha) {
    const ambito = ficha.secciones
        .find(s => s.name === 'Informacion Clinica')
        .fields.find(f => Object.keys(f).includes('requerimientocuidado'))
        .requerimientocuidado.nombre;
    return getEventoId(ambito);
}

export function getEventoId(value) {
    return (value === 'Ambulatorio' ? '329' : '330');
}
