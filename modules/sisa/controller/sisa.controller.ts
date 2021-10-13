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
                altaDeterminacionCovid(resAltaMuestra.id, orgSisa);
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
        const dtoEventoCasoNominal = {
            idTipodoc: '1',
            nrodoc: ficha.paciente.documento,
            sexo: ficha.paciente.sexo === 'femenino' ? 'F' : (ficha.paciente.sexo === 'masculino') ? 'M' : 'X',
            fechaNacimiento: moment(ficha.paciente.fechaNacimiento).format('DD-MM-YYYY'),
            idGrupoEvento: '113',
            idEvento: '307',
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
        idMuestra: '276', // Hisopado nasofaríngeo (para test de Ag)
        idtipoMuestra: '4', // Humano - espacios no estériles
        muestra: true
    };

    return altaMuestra(dtoMuestra);
}

export async function altaDeterminacionCovid(idEventoMuestra, idEstablecimiento) {
    const dtoResultado = {
        derivada: false,
        fechaEmisionResultado: moment().format('YYYY-MM-DD'),
        fechaRecepcion: moment().format('YYYY-MM-DD'),
        idEstablecimiento,
        idEvento: '307',
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
    let result = null;
    try {
        result = await services.get('SISA-WS400').exec({ altaEventoCasoNominal });
        if (result.resultado !== 'OK') {
            throw new Error(result.description || 'error export SISA ws400');
        }
        return result;
    } catch (e) {
        await logSisa.error('sisa:export:evento', result, e.message, userScheduler);
        return false;
    }
}

export async function altaMuestra(dtoMuestra) {
    let result = null;
    try {
        result = await services.get('SISA-WS75').exec(dtoMuestra);
        if (!result.id) {
            throw new Error('error export SISA ws75');
        }
        return result;
    } catch (e) {
        await logSisa.error('sisa:export:muestra', result, e.message, userScheduler);
        return false;
    }
}

export async function altaDeterminacion(dtoDeterminacion) {
    try {
        const result = await services.get('SISA-WS76').exec(dtoDeterminacion);
        return result;
    } catch (e) {
        await logSisa.error('sisa:export:determinacion', null, e.message, userScheduler);
        return false;
    }
}
