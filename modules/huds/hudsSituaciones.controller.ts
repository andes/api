import { PacienteCtr } from '../../core-v2/mpi/paciente/paciente.routes';
import { SnomedCtr } from '../../core/term/controller/snomed.controller';
import { Prestacion } from '../rup/schemas/prestacion';
import { CarnetPerinatal } from '../perinatal/schemas/carnet-perinatal.schema';
import { buscarEnHuds } from '../rup/controllers/rup';
import * as moment from 'moment';

// SNOMED ECL para antecedentes familiares
const ECL_ANTECEDENTES_FAMILIARES = '<< 57177007';

function registrosPorSemanticTag(registros, semanticTag) {
    const result = [];
    for (const registro of registros) {
        if (registro.concepto && registro.concepto.semanticTag === semanticTag) {
            result.push(registro);
        }
        if (registro.registros && registro.registros.length > 0) {
            result.push(...registrosPorSemanticTag(registro.registros, semanticTag));
        }
    }
    return result;
}

export async function situacionesActivas(pacienteID) {
    const paciente = await PacienteCtr.findById(pacienteID);
    if (!paciente) {
        return null;
    }

    const result: any[] = [];

    const prestaciones: any[] = await Prestacion.find({
        'paciente.id': { $in: paciente.vinculos },
        'estadoActual.tipo': 'validada'
    });

    for (const prestacion of prestaciones) {
        const registros = registrosPorSemanticTag(prestacion.ejecucion.registros || [], 'trastorno');
        for (const registro of registros) {
            result.push({
                tipo: 'trastorno',
                concepto: registro.concepto,
                fecha: prestacion.ejecucion.fecha,
                profesional: prestacion.solicitud.profesional,
                organizacion: prestacion.ejecucion.organizacion,
                idPrestacion: prestacion._id,
                tipoPrestacion: prestacion.solicitud.tipoPrestacion
            });
        }
    }

    // Usar vinculos para cubrir pacientes con múltiples identificadores ANDES
    const carnet: any = await CarnetPerinatal.findOne({
        'paciente.id': { $in: paciente.vinculos },
        fechaFinEmbarazo: null
    });

    if (carnet && carnet.embarazoEnCurso) {
        const controles = (carnet.controles || []).sort(
            (a, b) => moment(b.fechaControl).valueOf() - moment(a.fechaControl).valueOf()
        );
        const ultimoControl = controles.length > 0 ? controles[0] : null;

        if (ultimoControl && moment(ultimoControl.fechaControl).isAfter(moment().subtract(9, 'months'))) {
            result.push({
                tipo: 'embarazo',
                situacion: 'embarazo en curso',
                fechaUltimoControl: ultimoControl.fechaControl,
                profesional: ultimoControl.profesional,
                idPrestacion: ultimoControl.idPrestacion,
                organizacion: ultimoControl.organizacion
            });
        }
    }

    return result;
}

/**
 * Antecedentes personales: trastornos registrados en prestaciones validadas del paciente.
 * Filtra por semanticTag === 'trastorno' en memoria (sin llamada a Snowstorm).
 * Incluye registros anidados recursivamente.
 */
export async function antecedentesPersonales(pacienteID) {
    const paciente = await PacienteCtr.findById(pacienteID);
    if (!paciente) {
        return null;
    }

    const prestaciones: any[] = await Prestacion.find({
        'paciente.id': { $in: paciente.vinculos },
        'estadoActual.tipo': 'validada'
    });

    const result: any[] = [];

    for (const prestacion of prestaciones) {
        const registros = registrosPorSemanticTag(prestacion.ejecucion.registros || [], 'trastorno');
        for (const registro of registros) {
            result.push({
                concepto: registro.concepto,
                fecha: prestacion.ejecucion.fecha,
                profesional: prestacion.solicitud.profesional,
                organizacion: prestacion.ejecucion.organizacion,
                idPrestacion: prestacion._id,
                tipoPrestacion: prestacion.solicitud.tipoPrestacion
            });
        }
    }

    return result;
}

export async function antecedentesFamiliares(pacienteID) {
    const paciente = await PacienteCtr.findById(pacienteID);
    if (!paciente) {
        return null;
    }

    const expression = '<< 57177007';
    const conceptos = await SnomedCtr.getConceptByExpression(expression);

    if (!conceptos || conceptos.length === 0) {
        return [];
    }

    const prestaciones: any[] = await Prestacion.find({
        'paciente.id': { $in: paciente.vinculos },
        'estadoActual.tipo': 'validada'
    });

    return buscarEnHuds(prestaciones, conceptos);
}
