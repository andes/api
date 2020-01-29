import * as mongoose from 'mongoose';
import { Camas, INTERNACION_CAPAS } from './camas.schema';
import * as CamasEstadosController from './cama-estados.controller';
import * as moment from 'moment';
import { EstadosCtr } from './estados.routes';
import { model as Prestaciones } from '../schemas/prestacion';
import { Request } from '@andes/api-tool';
import { ObjectId } from '@andes/core';
import { ISnomedConcept } from '../schemas/snomed-concept';

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

export async function historial({ organizacion, capa, ambito }, cama: ObjectId, internacion: ObjectId, desde: Date, hasta: Date) {
    const movimientos = await CamasEstadosController.searchEstados({ desde, hasta, organizacion, capa, ambito }, { cama, internacion });
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

export async function listaEspera({ fecha, organizacion, ambito, capa }: { fecha: Date, organizacion: INombre, ambito: String, capa: String }) {

    const $match = {};
    if (fecha) {
        $match['ejecucion.registros.valor.informeIngreso.fechaIngreso'] = {
            $lte: moment(fecha).toDate().toISOString()
        };
    } else {
        fecha = new Date();
    }


    const prestaciones$ = Prestaciones.aggregate([
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


/**
 * Modifica el estado de una cama (movimiento).
 * @param data
 * @param req
 */

export async function patch(data: Partial<ICama>, req: Request) {
    const estadoCama = await findById({ organizacion: data.organizacion, capa: data.capa, ambito: data.ambito }, data.id, data.fecha);

    const maquinaEstado = await EstadosCtr.encontrar(data.organizacion._id, data.ambito, data.capa);

    const cambioPermitido = await maquinaEstado.check(estadoCama.estado, data.estado);

    if (cambioPermitido) {
        const nuevoEstado = {
            ...estadoCama,
            ...data
        };

        const [camaEncontrada]: [any, any] = await Promise.all([
            Camas.findById(data.id),
            CamasEstadosController.store({ organizacion: data.organizacion._id, ambito: data.ambito, capa: data.capa, cama: data.id }, nuevoEstado, req),
        ]);

        camaEncontrada.set(data);
        if (data.unidadOrganizativa) {
            camaEncontrada.unidadOrganizativaOriginal = data.unidadOrganizativa;
        }
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
        equipamiento: data.equipamiento,
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

export async function changeTime({ organizacion, capa, ambito }: InternacionConfig, cama: ObjectId, from: Date, to: Date, internacionId: ObjectId) {
    let start, end;
    if (from.getTime() <= to.getTime()) {
        start = from;
        end = to;
    } else {
        start = to;
        end = from;
    }
    const movement = await CamasEstadosController.searchEstados({ desde: start, hasta: end, organizacion: organizacion._id, capa, ambito }, { internacion: internacionId });
    // Porque el movimiento a cambiar de fecha va a ser encontrado
    if (movement.length > 1) {
        return false;
    }
    const valid = await CamasEstadosController.patch({ organizacion: organizacion._id, capa, ambito, cama }, from, to);
    return valid;
}
