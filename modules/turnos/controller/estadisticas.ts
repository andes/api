import * as AgendarModel from '../schemas/agenda';
import { toArray } from '../../../utils/utils';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { paciente as Paciente, pacienteMpi as PacienteMpi } from '../../../core/mpi/schemas/paciente';

const ObjectId = mongoose.Types.ObjectId;

const turnoAsignadoMatch = {
    $match: {
        'turno.paciente.nombre': { $exists: true },
        'turno.estado': 'asignado',
        estado: { $ne: 'suspendida' }
    }
};

const facets = {
    edad: [
        turnoAsignadoMatch,
        {
            $bucket: {
                groupBy: '$turno.paciente.edad',
                boundaries: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
                default: 0,
                output: {
                    count: { $sum: 1 }
                }
            }
        }
    ],

    sexo: [
        turnoAsignadoMatch,
        {
            $group: {
                _id: '$turno.paciente.sexo',
                total: { $sum: 1 }
            }
        }
    ],

    profesionales: [
        turnoAsignadoMatch,
        { $unwind: '$profesionales' },
        {
            $group: {
                _id: '$profesionales._id',
                count: { $sum: 1 },
                nombre: {$addToSet: { $concat: ['$profesionales.nombre', ' ', '$profesionales.apellido'] }}
            }
        }
    ],

    profesionalesAgendas: [
        { $unwind: '$profesionales' },
        {
            $group: {
                _id: '$profesionales._id',
                count: { $sum: 1 },
                nombre: {$addToSet: { $concat: ['$profesionales.nombre', ' ', '$profesionales.apellido'] }}
            }
        }
    ],

    administrativo: [
        turnoAsignadoMatch,
        {
            $group: {
                _id: '$turno.updatedBy.username',
                count: { $sum: 1 },
                nombre: { $first: '$turno.updatedBy.nombre' },
                apellido: { $first: '$turno.updatedBy.apellido' }
            }
        }
    ],

    prestacion: [
        turnoAsignadoMatch,
        {
            $group: {
                _id: '$turno.tipoPrestacion.conceptId',
                count: { $sum: 1 },
                nombre: { $first: '$turno.tipoPrestacion.term' }
            }
        }
    ],

    prestacionAgendas: [
        { $unwind: '$tipoPrestaciones' },
        {
            $group: {
                _id: '$tipoPrestaciones.conceptId',
                count: { $sum: 1 },
                nombre: { $first: '$tipoPrestaciones.term' }
            }
        }
    ],

    estadoAgenda: [
        {
            $group: {
                _id: '$estado',
                nombre: { $first: '$estado' },
                count: { $sum: 1 }
            }
        }
    ],

    estadoTurno: [
        { $match: { 'turno.estado': { $ne: 'turnoDoble' } } },
        {
            $addFields: {
                'real-state': {
                    $cond: {
                        if: { $eq: ['$estado', 'suspendida'] },
                        then: { $cond: { if: { $ne: ['$turno.reasignado.siguiente', null] }, then: 'reasignado', else: 'suspendida' } },
                        else: '$turno.estado'
                    }
                }
            }
        },
        { $sortByCount: '$real-state' }
    ],

    tipoTurno: [
        {
            $match: {
                'turno.estado': 'asignado',
                estado: { $ne: 'suspendida' },
                'turno.tipoTurno': { $ne: null }
            }
        },
        {
            $group: {
                _id: '$turno.tipoTurno',
                count: { $sum: 1 },
                nombre: {$first: '$turno.tipoTurno'}
            }
        }
    ]
};

function makePrimaryMatch(filtros) {
    const match: any = {};

    if (filtros.tipoDeFiltro === 'turnos') {
        match.estado = { $nin: ['planificacion', 'pausada', 'borrada'] };
    }

    if (filtros.fechaDesde) {
        match.horaInicio = { $gte: moment(filtros.fechaDesde).startOf('day').toDate() };
    }

    if (filtros.fechaHasta) {
        match.horaFin = { $lte: moment(filtros.fechaHasta).endOf('day').toDate() };
    }

    if (filtros.organizacion) {
        match['organizacion._id'] = ObjectId(filtros.organizacion);
    }

    return match;
}

function makeSecondaryMatch(filtros) {
    const match: any = {};

    if (filtros.tipoDeFiltro === 'turnos') {
        if (filtros.edad) {
            const ages = filtros.edad.split('-');
            match['turno.paciente.edad'] = {
                $gte: parseInt(ages[0], 10)
            };
            match['turno.paciente.edad'] = {
                $lt: parseInt(ages[1], 10)
            };
        }

        if (filtros.sexo) {
            match['turno.paciente.sexo'] = filtros.sexo;
        }

        if (filtros.profesional) {
            match['profesionales._id'] = {
                $in: filtros.profesional.map(pr => mongoose.Types.ObjectId(pr.id))
            };
        }

        if (filtros.administrativo) {
            match['turno.updatedBy.username'] = parseInt(filtros.administrativo, 10);
        }

        if (filtros.prestacion) {
            match['turno.tipoPrestacion.conceptId'] = {
                $in: filtros.prestacion.map(pres => pres.id)
            };
        }

        if (filtros.tipoTurno) {
            match['turno.tipoTurno'] = {
                $in: filtros.tipoTurno
            };
        }

        if (filtros.estado_turno) {
            match['turno.estado'] = {
                $in: filtros.estado_turno
            };
        }
    } else {
        if (filtros.profesional) {
            match['profesionales._id'] = {
                $in: filtros.profesional.map(pr => mongoose.Types.ObjectId(pr.id))
            };
        }

        if (filtros.prestacion) {
            match['tipoPrestaciones.conceptId'] = {
                $in: filtros.prestacion.map(pres => pres.id)
            };
        }

        if (filtros.estado_agenda) {
            match['estado'] = {
                $in: filtros.estado_agenda
            };
        }
    }
    return match;
}

function makeFacet(filtros) {
    const facet: any = {};

    if (filtros.tipoDeFiltro === 'turnos') {
        facet['prestacion'] = facets['prestacion'];
        if (!filtros.profesionales) {
            facet['profesionales'] = facets['profesionales'];
        }
        facet['estado_turno'] = facets.estadoTurno;
        facet['tipoTurno'] = facets.tipoTurno;
    } else {
        facet['profesionales'] = facets['profesionalesAgendas'];
        facet['prestacion'] = facets['prestacionAgendas'];
        facet['estado_agenda'] = facets['estadoAgenda'];
    }


    return facet;
}

function filtrosFaltantes(filtros, data) {

    if (filtros.profesional) {
        filtros.profesional.forEach((pr: any) => {
            let hayProfesional = data.profesionales.find(prof => prof._id.toString() === pr.id);
            if (hayProfesional === undefined) {
                data.profesionales.push({ _id: pr.id, count: 0, nombre: pr.nombre });
            }
        });
    }

    if (filtros.prestacion) {
        filtros.prestacion.forEach((prestacion: any) => {
            let hayPrestacion = data.prestacion.find(prest => prest._id.toString() === prestacion.id);
            if (hayPrestacion === undefined) {
                data.prestacion.push({ _id: prestacion._id, count: 0 , nombre: prestacion.nombre});
            }
        });
    }

    if (filtros.tipoTurno) {
        filtros.tipoTurno.forEach((tt: any) => {
            let hayTipoTurno = data.tipoTurno.find(datatt => datatt._id === tt);
            if (hayTipoTurno === undefined) {
                data.tipoTurno.push({ _id: tt, count: 0, nombre: tt });
            }
        });
    }

    if (filtros.estado_turno) {
        filtros.estado_turno.forEach((et: any) => {
            let hayEstadoTurno = data.estado_turno.find(dataET => dataET._id === et);
            if (hayEstadoTurno === undefined) {
                data.estado_turno.push({ _id: et, count: 0, nombre: et });
            }
        });
    }

    if (filtros.estado_agenda) {
        filtros.estado_agenda.forEach((ea: any) => {
            let hayEstadoAgenda = data.estado_agenda.find(dataEA => dataEA._id === ea);
            if (hayEstadoAgenda === undefined) {
                data.estado_agenda.push({ _id: ea, count: 0, nombre: ea });
            }
        });
    }
}

export async function estadisticas(filtros) {
    let pipeline;
    const pipelineAgendas = [
        { $match: makePrimaryMatch(filtros) },
        { $match: makeSecondaryMatch(filtros) },
        { $facet: makeFacet(filtros) }
    ];
    const pipelineTurno = [
        /* Filtros iniciales */
        { $match: makePrimaryMatch(filtros) },
        { $addFields: { 'sobreturnos.tipoTurno': 'sobreturno' } },
        { $addFields: { _sobreturnos: [{ turnos: '$sobreturnos' }] } },
        { $addFields: { _bloques: { $concatArrays: ['$_sobreturnos', '$bloques'] } } },
        { $unwind: '$_bloques' },
        { $unwind: '$_bloques.turnos' },
        {
            $project: {
                turno: '$_bloques.turnos',
                profesionales: 1,
                prestaciones: '$_bloques.tipoPrestaciones',
                estado: '$estado'
            },
        },
        {
            $addFields: {
                'turno.paciente.edad': {
                    $divide: [{
                        $subtract: [
                            '$turno.horaInicio',
                            {
                                $cond: {
                                    if: { $eq: [{ $type: '$turno.paciente.fechaNacimiento' }, 'string'] },
                                    then: { $dateFromString: { dateString: '$turno.paciente.fechaNacimiento' } },
                                    else: '$turno.paciente.fechaNacimiento'
                                }
                            }
                        ]
                    }, (365 * 24 * 60 * 60 * 1000)]
                }
            }
        },
        { $match: makeSecondaryMatch(filtros) },
        { $facet: makeFacet(filtros) }
    ];

    if (filtros.tipoDeFiltro === 'turnos') {
        pipeline = pipelineTurno;
    } else {
        pipeline = pipelineAgendas;
    }

    const p1 = toArray(AgendarModel.aggregate(pipeline).cursor({ batchSize: 1000 }).exec());
    const p2 = filtroPorCiudad(filtros);
    const [datos, localidades] = await Promise.all([p1, p2]);
    filtrosFaltantes(filtros, datos[0]);
    datos[0]['localidades'] = localidades;
    return datos[0];
}

/**
 * Busca en la base de mpi y andes a los pacientes y retorna el tipo de turno
 * y la ubicacion de los pacientes
 * @param filtros Recibe a los filtros iniciales.
 */
async function filtroPorCiudad(filtros) {
    const pipelineAsignados = [
        { $match: makePrimaryMatch(filtros) },
        { $addFields: { 'sobreturnos.tipoTurno': 'sobreturno' } },
        { $addFields: { _sobreturnos: [{ turnos: '$sobreturnos' }] } },
        { $addFields: { _bloques: { $concatArrays: ['$_sobreturnos', '$bloques'] } } },
        { $unwind: '$_bloques' },
        { $unwind: '$_bloques.turnos' },
        {
            $project: {
                turno: '$_bloques.turnos',
                idPaciente: '$_bloques.turnos.paciente.id',
                _id: 0
            },
        },
        { $match: { 'turno.paciente.nombre': { $exists: true }, 'turno.estado': 'asignado' } },
        { $match: makeSecondaryMatch(filtros) },
    ];
    const turnosAsignados = await toArray(AgendarModel.aggregate(pipelineAsignados).cursor({ batchSize: 1000 }).exec());
    let idPacientes = turnosAsignados.map(data => ObjectId(data.idPaciente));

    const pipelineUbicacionPacientes = [
        {
            $match: {
                _id:
                    { $in: idPacientes },
            }
        },
        {
            $project: {
                direccion: 1,
                _id: 1
            }
        }
    ];
    const p1 = await toArray(Paciente.aggregate(pipelineUbicacionPacientes).cursor({ batchSize: 1000 }).exec());
    const p2 = await toArray(PacienteMpi.aggregate(pipelineUbicacionPacientes).cursor({ batchSize: 1000 }).exec());
    const [andes, mpi] = await Promise.all([p1, p2]);

    const ubicacionesPaciente = {};
    andes.forEach(paciente => { ubicacionesPaciente[paciente._id] = paciente.direccion[0]; });
    mpi.forEach(paciente => { ubicacionesPaciente[paciente._id] = paciente.direccion[0]; });

    const respuesta = {};

    turnosAsignados.forEach(data => {
        let nombreLocalidad = 'sin localidad';
        if (data.turno && data.turno.tipoTurno) {
            if (ubicacionesPaciente[data.idPaciente] && ubicacionesPaciente[data.idPaciente].ubicacion
                && ubicacionesPaciente[data.idPaciente].ubicacion.localidad) {
                nombreLocalidad = ubicacionesPaciente[data.idPaciente].ubicacion.localidad.nombre;
            }
            if (!respuesta[nombreLocalidad]) {
                respuesta[nombreLocalidad] = { delDia: 0, programado: 0, gestion: 0, profesional: 0, sobreturno: 0 };
            }
            respuesta[nombreLocalidad][data.turno.tipoTurno]++;
        }
    });
    return respuesta;
}

