import * as mongoose from 'mongoose';
import { Camas, INTERNACION_CAPAS } from './camas.schema';
import * as CamasEstadosController from './cama-estados.controller';
import * as moment from 'moment';
import { EstadosCtr } from './estados.routes';
import { Prestacion } from '../schemas/prestacion';
import { Request } from '@andes/api-tool';
import { ObjectId } from '@andes/core';
import { ISnomedConcept } from '../schemas/snomed-concept';
import { EventCore } from '@andes/event-bus';

interface INombre {
    _id: ObjectId;
    nombre?: String;
}

interface InternacionConfig {
    /**
     * ID de la organización de consulta.
     */
    organizacion: INombre;

    /**
     * El proceso hospitalario. 'internacion' o 'guardia'.
     * Por el momento solo se va a usar internacion.
     */

    ambito: String;

    /**
     * La vista del mapa de capa. enfermeria, medica, estadistica.
     */

    capa: String;
}

interface SearchParams {
    cama?: ObjectId;
    paciente?: ObjectId;
    internacion?: ObjectId;
    estado?: ObjectId;
    fecha?: Date;
}

export interface ICama {
    _id: ObjectId;
    id: ObjectId;
    genero: ISnomedConcept;
    estado: String;
    esCensable: Boolean;
    idInternacion: ObjectId;
    esMovimiento: Boolean;
    fecha: Date;
    unidadOrganizativa: ISnomedConcept;
    especialidades: ISnomedConcept[];
    createdAt: Date;
    createdBy: Object;
    organizacion: { _id: ObjectId, nombre: String };
    ambito: String;
    unidadOrganizativaOriginal: ISnomedConcept;
    sectores: Object[];
    nombre: String;
    tipoCama: ISnomedConcept;
    equipamiento: ISnomedConcept[];
    capa: String;
    paciente?: {
        _id: ObjectId;
        id: ObjectId;
        nombre: String;
        apellido: String;
        sexo?: String;
        documento?: String;
        fechaNacimiento?: Date;
    };
    extras: any;
    nota: String;
}


/**
 * Listado de camas y sus estados a una fecha determinada.
 */

export async function search({ organizacion, capa, ambito }: InternacionConfig, params: SearchParams): Promise<ICama[]> {
    let timestamp = moment().toDate();

    if (params.fecha) {
        timestamp = moment(params.fecha).toDate();
    }

    return await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion: organizacion._id, ambito, capa }, params);
}

export async function historial({ organizacion, capa, ambito }, cama: ObjectId, internacion: ObjectId, desde: Date, hasta: Date, esMovimiento: boolean = null) {
    const movimientos = await CamasEstadosController.searchEstados({ desde, hasta, organizacion, capa, ambito }, { cama, internacion, esMovimiento });
    return movimientos;
}

/**
 * Devuelve una cama en particular a una cierta hora.
 */
export async function findById({ organizacion, capa, ambito }: InternacionConfig, idCama: ObjectId, timestamp: Date = null): Promise<ICama> {
    if (!timestamp) {
        timestamp = moment().toDate();
    }

    const estadoCama = await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion: organizacion._id, ambito, capa }, { cama: idCama });
    if (estadoCama.length > 0) {
        return estadoCama[0];
    }

    return null;
}

/**
 * Devuelve la cama donde esta el paciente en un determinado horario
 */
export async function findByPaciente({ organizacion, capa, ambito }: InternacionConfig, idPaciente: ObjectId, timestamp: Date = null): Promise<ICama> {
    if (!timestamp) {
        timestamp = moment().toDate();
    }
    const estadoCama = await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion: wrapOrganizacion(organizacion), ambito, capa }, { paciente: idPaciente });
    if (estadoCama.length > 0) {
        return estadoCama[0];
    }

    return null;
}

function wrapOrganizacion(organizacion) {
    return organizacion.id || organizacion._id || organizacion;
}

export async function listaEspera({ fecha, organizacion, ambito, capa }: { fecha: Date, organizacion: INombre, ambito: String, capa: String }) {

    const $match = {};
    if (fecha) {
        $match['ejecucion.registros.valor.informeIngreso.fechaIngreso'] = {
            $lte: moment(fecha).toDate().toISOString()
        };
    } else {
        fecha = new Date();
    }


    const prestaciones$ = Prestacion.aggregate([
        {
            $match: {
                'solicitud.organizacion.id': mongoose.Types.ObjectId(organizacion._id as any),
                'solicitud.ambitoOrigen': 'internacion',
                'solicitud.tipoPrestacion.conceptId': '32485007',
                ...$match
            }
        },
        {
            $addFields: { lastState: { $arrayElemAt: ['$estados', -1] } }
        },
        {
            $match: { 'lastState.tipo': 'ejecucion' }
        },
        { $project: { _v: 0, lastState: 0 } }
    ]);

    const estadoCama$ = CamasEstadosController.snapshotEstados({ fecha, organizacion: organizacion._id, ambito, capa }, {});

    const [prestaciones, estadoCama] = await Promise.all([prestaciones$, estadoCama$]);

    const listaDeEspera = prestaciones.filter(prest => !estadoCama.find(est => String(prest._id) === String(est.idInternacion)));

    return listaDeEspera;
}

function determinarMovimiento(source, target) {
    if (source.estado === 'ocupada') {
        const targetHasUO = target.unidadOrganizativa && target.unidadOrganizativa.conceptId;
        if (targetHasUO) {
            return target.unidadOrganizativa.conceptId !== source.unidadOrganizativa.conceptId;
        }
    }
    return false;
}

/**
 * Modifica el estado de una cama (movimiento).
 * @param data
 * @param req
 */

export async function patch(data: Partial<ICama>, req: Request) {
    let cambioPermitido = true;
    const estadoCama = await findById({ organizacion: data.organizacion, capa: data.capa, ambito: data.ambito }, data.id, data.fecha);

    if (data.esMovimiento) {
        const maquinaEstado = await EstadosCtr.encontrar(data.organizacion._id, data.ambito, data.capa);
        cambioPermitido = await maquinaEstado.check(estadoCama.estado, data.estado);
    } else {
        // por las dudas borro datos que no se deben cambiar
        delete data['idInternacion'];
        delete data['estado'];
        delete data['paciente'];
    }

    const metadata = data['metadata'];
    delete data['metadata'];

    if (cambioPermitido) {
        if ((data as any).idCama || (data as any).createdAt) {
            // La APP debería mandar solo lo que quiere modificar
            // por las dudas limpiamos el objeto
            delete data['idCama'];
            delete data['createdAt'];
            delete data['createdBy'];
            delete data['updatedAt'];
            delete data['updatedBy'];
        }

        estadoCama.extras = null; // Los extras no se transfieren entre estados
        // Si la cama esta ocupada, registro el movimiento como un cambio legal.
        const registraMovimiento = data.esMovimiento || determinarMovimiento(estadoCama, data);
        const nuevoEstado = {
            ... (registraMovimiento ? estadoCama : {}),
            ...data,
            esMovimiento: registraMovimiento
        };

        const [camaEncontrada]: [any, any] = await Promise.all([
            Camas.findById(data.id),
            CamasEstadosController.store({ organizacion: data.organizacion._id, ambito: data.ambito, capa: data.capa, cama: data.id }, nuevoEstado, req),
        ]);

        if (nuevoEstado.extras?.egreso) {
            EventCore.emitAsync('mapa-camas:paciente:egreso', nuevoEstado);
        }
        if (nuevoEstado.extras?.ingreso) {
            EventCore.emitAsync('mapa-camas:paciente:ingreso', { ...nuevoEstado, metadata });
        }


        camaEncontrada.set(data);
        camaEncontrada.audit(req);
        return await camaEncontrada.save();
    }

    return null;
}

/**
 * Crea una cama de creo. Genera el movimiento inicial en cada capa.
 * @param data
 * @param req
 */
export async function store(data: Partial<ICama>, req: Request) {
    const nuevaCama: any = new Camas({
        organizacion: data.organizacion,
        ambito: data.ambito,
        unidadOrganizativaOriginal: data.unidadOrganizativa,
        sectores: data.sectores,
        nombre: data.nombre,
        tipoCama: data.tipoCama,
    });
    nuevaCama.audit(req);

    const fecha = data.fecha || moment().toDate();

    const nuevoEstado = {
        fecha,
        estado: 'disponible',
        unidadOrganizativa: data.unidadOrganizativa,
        especialidades: data.especialidades,
        genero: data.genero,
        esCensable: data.esCensable,
        esMovimiento: data.esMovimiento,
        equipamiento: data.equipamiento,
        nota: data.nota,
    };

    const [camaGuardada] = await Promise.all([
        nuevaCama.save(),
        ...INTERNACION_CAPAS.map(capa => {
            return CamasEstadosController.store({ organizacion: data.organizacion._id, ambito: data.ambito, capa, cama: nuevaCama._id }, nuevoEstado, req);
        })
    ]);

    return camaGuardada;
}

/**
 * Operacion especial para cambiar la fecha de un estado.

 */

export async function changeTime({ organizacion, capa, ambito }: InternacionConfig, cama: ObjectId, from: Date, to: Date, internacionId: ObjectId, req) {
    let start, end;
    if (from.getTime() <= to.getTime()) {
        start = from;
        end = to;
    } else {
        start = to;
        end = from;
    }
    const movements = await CamasEstadosController.searchEstados({ desde: start, hasta: end, organizacion: organizacion._id, capa, ambito }, { internacion: internacionId });
    // Porque el movimiento a cambiar de fecha va a ser encontrado
    if (movements.length > 1) {
        return false;
    }

    const myMov = movements[0];
    await CamasEstadosController.remove({ organizacion: organizacion._id, capa, ambito, cama }, from);

    myMov.fecha = to;

    const valid = await CamasEstadosController.store({ organizacion: organizacion._id, capa, ambito, cama }, myMov, req);
    return valid;
}

/**
 * Chequea la integridad de los estados de las camas.
 */
export async function integrityCheck({ organizacion, capa, ambito }: InternacionConfig, { cama, from, to }) {
    let res = [];
    let start = from || moment('1900-01-01').toDate();
    let end = to || moment().toDate();
    if (start.getTime() > end.getTime()) {
        const aux = start;
        start = end;
        end = aux;
    }

    const allMovements = await CamasEstadosController.searchEstados({ desde: start, hasta: end, organizacion: organizacion._id, capa, ambito }, { cama });
    const groupedMovements = Object.entries(groupBy(allMovements, 'idCama'));
    const maquinaEstado = await EstadosCtr.encontrar(organizacion._id, ambito, capa);

    groupedMovements.map(async ([idCama, movementsCama]: [string, ICama[]]) => {
        movementsCama.slice(1).map(async (movement, index) => {
            if (movement.esMovimiento) {
                let cambioPermitido = false;
                if (movementsCama[index].estado !== 'ocupada' || movement.estado !== 'ocupada') {
                    cambioPermitido = await maquinaEstado.check(movementsCama[index].estado, movement.estado);
                }

                if (!cambioPermitido) {
                    res.push({ source: movementsCama[index], target: movement });
                }
            }
        });
    });

    return res;
}

function groupBy(xs: any[], key: string) {
    return xs.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}

export async function sectorChange(idOrganizacion, sector) {
    await Camas.update(
        {
            'organizacion._id': mongoose.Types.ObjectId(idOrganizacion),
            sectores: { $elemMatch: { _id: mongoose.Types.ObjectId(sector._id) } }
        },
        {
            $set: {
                'sectores.$.nombre': sector.nombre,
                'sectores.$.tipoSector': sector.tipoSector,
                'sectores.$.unidadConcept': sector.unidadConcept,
            }
        },
        {
            upsert: false,
            multi: true,
        }
    );
}

export async function checkSectorDelete(idOrganizacion: string, idSector: string) {
    const ambito = 'internacion';
    const capa = 'estadistica';
    const estadoCama = await CamasEstadosController.snapshotEstados({ fecha: moment().toDate(), organizacion: idOrganizacion, ambito, capa }, { sector: idSector });
    if (estadoCama[0] && estadoCama[0].estado !== 'inactiva') {
        return false;
    }

    return true;
}
