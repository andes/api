import * as agenda from '../../turnos/schemas/agenda';
import * as prestaciones from '../../../modules/rup/schemas/prestacion';
import * as mongoose from 'mongoose';
import { toArray } from '../../../utils/utils';

/**
 * @export Devuelve los turnos con paciente asignado que cumplen con los filtros
 * @param {object} Filtros {rango de fechas, prestación, profesional, financiador, estado}
 * @returns {object} {fecha, paciente, financiador, prestacion, profesionales, estado, idAgenda, idBloque, turno, idPrestacion:null}
 */


export async function procesar(parametros: any) {
    let match = {
        estado: { $nin: ['planificacion', 'borrada', 'suspendida', 'pausada'] },
        'organizacion._id': parametros.organizacion,
        bloques: {
            $ne: null
        },
        'bloques.turnos': {
            $ne: null
        },
        $or: [{ 'bloques.turnos.estado': 'asignado' }, { 'sobreturnos.estado': 'asignado' }]
    };
    let matchTurno = {};
    let matchEstado = {};
    if (parametros.estadoFacturacion) {
        match['bloques.turnos.estadoFacturacion.estado'] = parametros.estadoFacturacion;
        matchTurno['_bloques.turnos.estadoFacturacion.estado'] = parametros.estadoFacturacion;
    }

    if (parametros.fechaDesde) {
        match['horaInicio'] = { $gte: new Date(parametros.fechaDesde) };
    }

    if (parametros.fechaHasta) {
        match['horaFin'] = { $lte: new Date(parametros.fechaHasta) };
    }

    if (parametros.prestacion) {
        match['tipoPrestaciones._id'] = mongoose.Types.ObjectId(parametros.prestacion);
        matchTurno['$expr'] = { $and: [{ $eq: ['$_bloques.turnos.estado', 'asignado'] }, { $eq: ['$_bloques.turnos.tipoPrestacion._id', mongoose.Types.ObjectId(parametros.prestacion)] }] };
    } else {
        matchTurno['$expr'] = { $and: [{ $eq: ['$_bloques.turnos.estado', 'asignado'] }] };
    }

    if (parametros.profesional) {
        match['profesionales._id'] = mongoose.Types.ObjectId(parametros.profesional);
    }

    if (parametros.estado) {
        matchEstado['$expr'] = { $and: [{ $eq: ['$estado', parametros.estado] }] };
    }

    let matchOS = {};

    if (parametros.financiador) {

        if (parametros.financiador === 'No posee') {
            matchOS['$expr'] = {
                $and: [
                    { $ne: [{ $in: [{ $type: '$turno.paciente' }, ['missing', 'null', 'undefined']] }, true] },
                    { $ne: [{ $in: [{ $type: '$turno.paciente.obraSocial' }, ['missing', 'null', 'undefined']] }, false] },
                ]
            };
        } else {
            matchOS['$expr'] = {
                $and: [
                    { $eq: ['$turno.paciente.obraSocial.financiador', parametros.financiador] }
                ]
            };
        }
    }

    const pipelineBuscador = [
        { $match: match },
        { $addFields: { profesionales0: { $arrayElemAt: ['$profesionales', 0] } } },
        { $addFields: { 'sobreturnos.tipoTurno': 'sobreturno' } },
        {
            $addFields: {
                _sobreturnos: [{ turnos: '$sobreturnos' }]
            }
        },
        {
            $addFields: {
                _bloques: { $concatArrays: ['$_sobreturnos', '$bloques'] }
            }
        },
        { $unwind: '$_bloques' },
        { $unwind: '$_bloques.turnos' },
        // TODO volver a filtrar por estadoPrstacion. agregar filtro a matchTurno
        { $match: matchTurno },
        {
            $project: {
                idAgenda: '$_id',
                idBloque: '$bloques._id',
                turno: '$_bloques.turnos',
                profesionales0: '$profesionales0.apellido',
                profesionales: '$profesionales'
            }
        },
        {
            $lookup: {
                from: 'prestaciones',
                let: { idTurno: '$turno._id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$solicitud.turno', '$$idTurno'] }
                        }
                    },
                    {
                        $addFields: {
                            lastState: { $arrayElemAt: ['$estados', -1] },
                        },
                    },
                    {
                        $match: {
                            $expr: { $and: [{ $eq: ['$solicitud.turno', '$$idTurno'] }, { $eq: ['$lastState.tipo', 'validada'] }] }
                        }
                    },

                ],
                as: 'prestacionDelTurno'
            }
        },
        {
            $addFields: {
                codificacion0: { $arrayElemAt: ['$turno.diagnostico.codificaciones', 0] },
                isAnyTrue: { $anyElementTrue: ['$turno.diagnostico.codificaciones'] },
            }
        },
        {
            $addFields: {
                prestacion0: { $arrayElemAt: ['$prestacionDelTurno', -1] }
            }
        },
        {
            $project: {
                fecha: '$turno.horaInicio',
                paciente: '$turno.paciente',
                financiador: '$turno.paciente.obraSocial',
                prestacion: '$turno.tipoPrestacion',
                profesionales: '$profesionales',
                profesionales0: 1,
                estado: {
                    $cond: {
                        if: {
                            $and: [
                                { $eq: ['$isAnyTrue', true] },
                                { $ne: [{ $in: [{ $type: '$codificacion0.codificacionProfesional.snomed.conceptId' }, ['missing', 'null', 'undefined']] }, true] }
                            ]
                        },
                        then: 'Presente con registro del profesional',
                        else: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ['$turno.asistencia', 'noAsistio'] }, then: 'Ausente' },
                                    { case: { $eq: ['$turno.asistencia', 'sinDatos'] }, then: 'Sin registro de asistencia' },
                                    { case: { $eq: ['$turno.asistencia', 'asistio'] }, then: 'Presente sin registro del profesional' }
                                ],
                                default: 'Sin registro de asistencia'
                            }
                        }
                    },
                },
                idAgenda: '$idAgenda',
                idBloque: {
                    $cond: {
                        if: { $eq: ['$turno.tipoTurno', 'sobreturno'] },
                        then: null,
                        else: '$idBloque'
                    }
                },
                turno: '$turno',
                idPrestacion: '$prestacion0._id',
                estadoFacturacion: '$turno.estadoFacturacion',
            }
        },
        {
            $match: matchEstado
        },
        {
            $match: matchOS
        }
    ];

    const turnosAsignados = await agenda.aggregate(pipelineBuscador);
    return turnosAsignados;
}
