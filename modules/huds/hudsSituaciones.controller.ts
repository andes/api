import { PacienteCtr } from '../../core-v2/mpi/paciente/paciente.routes';
import { SnomedCtr } from '../../core/term/controller/snomed.controller';
import { Prestacion } from '../rup/schemas/prestacion';
import { CarnetPerinatal } from '../perinatal/schemas/carnet-perinatal.schema';
import { buscarEnHuds } from '../rup/controllers/rup';
import { Auth } from '../../auth/auth.class';
import * as moment from 'moment';

import { ECLQueries } from '../../core/tm/schemas/eclqueries.schema';

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

export async function situacionesActivas(pacienteID, req: any) {
    const paciente = await PacienteCtr.findById(pacienteID);
    if (!paciente) {
        return null;
    }

    const query: any = {
        'paciente.id': { $in: paciente.vinculos },
        'estadoActual.tipo': 'validada'
    };

    // Mismo criterio que /modules/rup/prestaciones cuando el usuario tiene huds:soloEfectorActual
    if (Auth.check(req, 'huds:soloEfectorActual')) {
        query['ejecucion.organizacion.id'] = Auth.getOrganization(req);
    }

    const prestaciones: any[] = await Prestacion.find(query);

    // Replica el filtro de privacidad aplicado en /modules/rup/prestaciones
    const profesional = Auth.getProfesional(req);
    const profesionalId = profesional && profesional.id && profesional.id.toString();
    for (const prestacion of prestaciones) {
        let profId = false;
        if (prestacion.solicitud.profesional && prestacion.solicitud.profesional.id) {
            profId = prestacion.solicitud.profesional.id.toString();
        }
        const registros = prestacion.ejecucion.registros;
        if (registros) {
            for (let j = 0; j < registros.length; j++) {
                const privacy = registros[j].privacy || { scope: 'public' };
                if (privacy.scope !== 'public' && profesionalId !== profId) {
                    switch (privacy.scope) {
                        case 'private':
                            registros.splice(j, 1);
                            j--;
                            break;
                        case 'termOnly':
                            registros[j].valor = 'El contenido de este registro sólo puede ser visualizado por el profesional que lo registró.';
                            registros[j].registros = [];
                            break;
                    }
                }
            }
        }
    }

    // Agrupamos por concepto.conceptId, igual que getConceptosByPaciente en el front
    const grupos = new Map<string, any>();
    for (const prestacion of prestaciones) {
        const registros = registrosPorSemanticTag(prestacion.ejecucion.registros || [], 'trastorno');
        for (const registro of registros) {
            const conceptId = registro.concepto.conceptId;
            if (!grupos.has(conceptId)) {
                grupos.set(conceptId, {
                    tipo: 'trastorno',
                    concepto: registro.concepto,
                    evoluciones: []
                });
            }
            grupos.get(conceptId).evoluciones.push({
                idPrestacion: prestacion._id,
                idRegistro: registro.id,
                tipoPrestacion: prestacion.solicitud.tipoPrestacion?.term,
                fechaCarga: prestacion.ejecucion.fecha,
                profesional: registro.createdBy?.nombreCompleto,
                organizacion: prestacion.ejecucion.organizacion?.nombre,
                fechaInicio: registro.valor?.fechaInicio ?? null,
                estado: registro.valor?.estado ?? '',
                evolucion: registro.valor?.evolucion ?? '',
                idRegistroOrigen: registro.valor?.idRegistroOrigen ?? null,
                valor: registro.valor
            });
        }
    }

    const result: any[] = [];
    for (const grupo of grupos.values()) {
        grupo.evoluciones.sort((a, b) => moment(b.fechaCarga).valueOf() - moment(a.fechaCarga).valueOf());
        // Solo dejamos las situaciones cuya última evolución está activa
        if (grupo.evoluciones[0].estado === 'activo') {
            result.push(grupo);
        }
    }

    // Ordenamos los grupos por la evolución más reciente (descendente)
    result.sort((a, b) => moment(b.evoluciones[0].fechaCarga).valueOf() - moment(a.evoluciones[0].fechaCarga).valueOf());

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

    const eclQuery = await ECLQueries.findOne({ key: 'antecedentes_personales' });
    const expression = eclQuery ? eclQuery.valor : '<< 312850006';
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

export async function antecedentesFamiliares(pacienteID) {
    const paciente = await PacienteCtr.findById(pacienteID);
    if (!paciente) {
        return null;
    }

    const eclQuery = await ECLQueries.findOne({ key: 'antecedentes_familiares' });
    const expression = eclQuery ? eclQuery.valor : '<< 57177007';
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
