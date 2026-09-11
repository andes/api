import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { getHistorialPaciente } from '../../core-v2/mpi/paciente/paciente.controller';
import { Agenda } from './schemas/agenda';
import { demanda, listaEspera } from './schemas/listaEspera';
import { ListaEsperaCtr } from './listaEspera.routes';
import { defaultLimit, maxLimit } from './../../config';

/**
 * Arma las condiciones de matcheo (aggregate $match) a partir de los query
 * params de búsqueda de listaEspera.
 */
export function armarQueryBusqueda(req) {
    let opciones: any = {};

    if (req.query.conceptId) {
        opciones['tipoPrestacion.conceptId'] = req.query.conceptId;
    }

    if (req.query.estado) {
        opciones['estado'] = req.query.estado;
    }

    if (req.query.fechaDesde) {
        const fechaDesde = moment(new Date(req.query.fechaDesde)).startOf('day').toDate();

        if (req.query.fechaHasta) {
            const fechaHasta = moment(new Date(req.query.fechaHasta)).endOf('day').toDate();
            opciones['demandas.fecha'] = { $gte: fechaDesde, $lte: fechaHasta };
        } else {
            opciones['demandas.fecha'] = { $gte: fechaDesde };
        }
    }

    if (req.query.prestacion) {
        const terminos = req.query.prestacion?.split(',').map(term => term.trim());

        opciones['$or'] = terminos.map(term => ({
            'tipoPrestacion.term': RegExp('^.*' + term + '.*$', 'i')
        }));
    }

    const motivoFiltro = req.query.motivo
        ? { motivo: RegExp('^.*' + req.query.motivo + '.*$', 'i') }
        : {};

    const organizacionFiltro = req.query.organizacion
        ? { 'organizacion.id': { $in: req.query.organizacion.split(',').map((id) => mongoose.Types.ObjectId(id)) } }
        : {};

    if (req.query.motivo || req.query.organizacion) {
        opciones = {
            ...opciones,
            demandas: {
                $elemMatch: {
                    ...motivoFiltro,
                    ...organizacionFiltro
                }
            }
        };
    }

    return opciones;
}

/**
 * Búsqueda de demanda insatisfecha (lista de espera).
 *
 * Se resuelve con un aggregate custom (no con el search estándar de
 * ResourceBase) por el $lookup a paciente y los filtros combinados sobre
 * el array `demandas`.
 */
export async function buscarListaEspera(req) {
    const opciones = armarQueryBusqueda(req);

    // apiOptions() no aplica defaultLimit/maxLimit por su cuenta (devuelve
    // limit: null si no vino en el query), así que se replica la misma
    // lógica que tenía el endpoint original.
    const options = req.apiOptions();
    const skip: number = options.skip || 0;
    const limit: number = Math.min(options.limit || defaultLimit, maxLimit);

    const pacienteAggregate = [
        {
            $match: opciones,
        },
        {
            $lookup: {
                from: 'paciente',
                let: { pacienteId: '$paciente' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$_id', '$$pacienteId.id'] }
                        }
                    },
                    ...(req.query.paciente ? [
                        {
                            $match: {
                                $or: [
                                    { nombre: { $regex: req.query.paciente, $options: 'i' } },
                                    { apellido: { $regex: req.query.paciente, $options: 'i' } },
                                    { documento: { $regex: req.query.paciente, $options: 'i' } }
                                ]
                            }
                        }
                    ] : [])
                ],
                as: 'paciente'
            }
        },
        {
            $unwind: { path: '$paciente', preserveNullAndEmptyArrays: true }
        },
        {
            $match: {
                paciente: { $ne: null }
            }
        },
        {
            $skip: skip,
        },
        {
            $limit: limit,
        }
    ];

    return listaEspera.aggregate(pacienteAggregate).exec();
}

/**
 * Si el paciente ya tiene un turno futuro asignado para la misma
 * prestación, devuelve ese turno. Se usa para bloquear la carga de una
 * demanda insatisfecha duplicada.
 */
export async function buscarTurnoFuturoExistente(req) {
    const historial = await getHistorialPaciente({
        ...req, query: {
            pacienteId: req.body.paciente.id,
            turnosProximos: true,
            estado: 'asignado',
            conceptId: req.body.tipoPrestacion.conceptId
        }
    });

    const turnos = historial.length ? historial.filter(item => moment(item.horaInicio).isAfter(moment())) : [];
    return turnos[0] || null;
}

/**
 * Carga de demanda insatisfecha: si ya existe un registro "pendiente" para
 * el mismo paciente/prestación, agrega la demanda al array existente; si
 * no, crea un nuevo documento.
 */
export async function agregarDemanda(req) {
    const params = {
        'paciente.id': req.body.paciente.id,
        'tipoPrestacion.conceptId': req.body.tipoPrestacion.conceptId,
        estado: 'pendiente'
    };

    const unaDemanda = {
        profesional: req.body.demandas[0].Profesional,
        organizacion: req.body.demandas[0].organizacion,
        motivo: req.body.demandas[0].motivo,
        fecha: moment().toDate(),
        origen: req.body.demandas[0].origen
    };

    const listaDocument: any = await listaEspera.findOne(params);

    if (listaDocument?.demandas) {
        const newDemanda = new demanda(unaDemanda);
        listaDocument.demandas.push(newDemanda);

        // se pasa el documento de mongoose directamente (no .toObject()).
        // La auditoría (documento raíz y cada `demanda`) la resuelve el
        // AuditPlugin aplicado en ambos schemas al hacer save().
        return ListaEsperaCtr.update(listaDocument._id, listaDocument, req);
    }

    const newListaDocument = new listaEspera(req.body);
    return ListaEsperaCtr.create(newListaDocument, req);
}

/**
 * Arma el sub-objeto `turno` a partir de una agenda + id de turno, usado
 * al resolver una demanda con un turno otorgado.
 */
export async function armarTurnoResolucion(idAgenda, idTurno) {
    const agenda: any = await Agenda.findById(idAgenda).exec();
    if (!agenda) {
        throw new Error('No se ha encontrado la agenda.');
    }

    const turnoAgenda = agenda.bloques.flatMap(bloque =>
        bloque.turnos.filter(t => t._id.toString() === idTurno)
    )[0];

    if (!turnoAgenda) {
        throw new Error('No se ha encontrado el turno');
    }

    return {
        id: turnoAgenda._id,
        horaInicio: turnoAgenda.horaInicio,
        tipo: turnoAgenda.tipoTurno,
        emitidoPor: turnoAgenda.emitidoPor,
        fechaHoraDacion: turnoAgenda.fechaHoraDacion,
        profesionales: agenda.profesionales,
        idAgenda,
        organizacion: {
            id: agenda.organizacion.id,
            nombre: agenda.organizacion.nombre
        },
    };
}

/* Se están enviando pacientes a la lista de espera desde una agenda suspendida */
export function listaEsperaSuspensionAgenda(req, agenda) {
    const listaEsperaArray = [];

    if (req.body.pacientes.length > 0) {
        for (let i = 0; i < req.body.pacientes.length; i++) {
            const newListaEspera = {};
            newListaEspera['fecha'] = moment().format();
            newListaEspera['estado'] = 'Agenda Suspendida';
            newListaEspera['tipoPrestacion'] = req.body.pacientes[i].tipoPrestacion;
            newListaEspera['profesional'] = agenda.profesionales[0];
            newListaEspera['paciente'] = req.body.pacientes[i].paciente;

            listaEsperaArray.push(newListaEspera);
        }
    } else {
        const newListaEspera = {};
        newListaEspera['fecha'] = moment().format();
        newListaEspera['estado'] = 'Turno Cancelado';
        newListaEspera['tipoPrestacion'] = req.body.pacientes.tipoPrestacion;
        newListaEspera['profesional'] = agenda.profesionales[0];
        newListaEspera['paciente'] = req.body.pacientes.paciente;
        listaEsperaArray.push(newListaEspera);
    }

    return listaEsperaArray;
}

/**
 * Según la operación recibida, genera y persiste los registros de
 * listaEspera correspondientes a una agenda suspendida.
 */
type Resultado<T> =
    | { status: 'fulfilled'; value: T }
    | { status: 'rejected'; reason: any };

/**
 * Equivalente a Promise.allSettled, sin depender de lib es2020 (el
 * tsconfig del proyecto no lo tiene tipado).
 */
async function settle<T>(promise: Promise<T>): Promise<Resultado<T>> {
    try {
        const value = await promise;
        return { status: 'fulfilled', value };
    } catch (reason) {
        return { status: 'rejected', reason };
    }
}

export async function procesarOperacionAgenda(req, agenda) {
    let listaEsperaPaciente: any[] = [];

    switch (req.body.op) {
        case 'listaEsperaSuspensionAgenda':
            listaEsperaPaciente = listaEsperaSuspensionAgenda(req, agenda);
            break;
    }

    const resultados = await Promise.all(
        listaEsperaPaciente.map((listaEsperaData) =>
            settle(ListaEsperaCtr.create(new listaEspera(listaEsperaData), req))
        )
    );

    const fallidos = resultados.filter(r => r.status === 'rejected');
    if (fallidos.length) {
        // no corta el batch (igual que el comportamiento original), pero
        // deja registro de qué falló en vez de tragárselo en silencio
        fallidos.forEach(f => {
            // eslint-disable-next-line no-console
            console.error('Error creando listaEspera por suspensión de agenda:', (f as any).reason);
        });
    }

    return resultados;
}
