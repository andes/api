import * as mongoose from 'mongoose';
import { Camas, INTERNACION_CAPAS } from './camas.schema';
import * as CamasEstadosController from './cama-estados.controller';
import * as moment from 'moment';
import { EstadosCtr } from './estados.routes';
import { model as Prestaciones } from '../schemas/prestacion';
import { Request } from '@andes/api-tool';

export async function search({ organizacion, capa, ambito }, params) {
    let timestamp = moment();

    if (params.fecha) {
        timestamp = moment(params.fecha);
    }

    return await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion: organizacion._id, ambito, capa }, params);
}

export async function findById({ organizacion, capa, ambito }, idCama, timestamp = null) {
    if (!timestamp) {
        timestamp = moment().toDate();
    }

    const estadoCama = await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion: organizacion._id, ambito, capa }, { cama: idCama });
    if (estadoCama.length > 0) {
        return estadoCama[0];
    }

    return null;
}

export async function listaEspera({ fecha, organizacion }) {
    const ambito = 'internacion';
    const capa = 'estadistica';

    const prestaciones = await Prestaciones.aggregate([
        {
            $match: {
                'solicitud.organizacion.id': mongoose.Types.ObjectId(organizacion._id),
                'solicitud.ambitoOrigen': 'internacion',
                'solicitud.tipoPrestacion.conceptId': '32485007',
                'ejecucion.registros.valor.informeIngreso.fechaIngreso': {
                    $lte: moment(fecha).toDate().toISOString()
                }
            }
        },
        {
            $unwind: '$estados'
        },
        {
            $match: {
                'estados.tipo': 'ejecucion'
            }
        }
    ]);

    const estadoCama = await CamasEstadosController.snapshotEstados({ fecha, organizacion: organizacion._id, ambito, capa }, {});

    const listaDeEspera = prestaciones.filter(prest => estadoCama.filter(est => prest._id !== est.idInternacion));

    return listaDeEspera;
}

type CAMA = any;

/**
 * Modifica el estado de una cama (movimiento).
 * @param data
 * @param req
 */

export async function patch(data: CAMA, req: Request) {

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
export async function store(data, req: Request) {
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
        esCensable: data.censable,
        esMovimiento: data.movimiento,
    };

    const [camaGuardada] = await Promise.all([
        nuevaCama.save(),
        ...INTERNACION_CAPAS.map(capa => {
            return CamasEstadosController.store({ organizacion: data.organizacion.id, ambito: data.ambito, capa, cama: nuevaCama._id }, nuevoEstado, req);
        })
    ]);

    return camaGuardada;
}


export async function changeTime({ organizacion, capa, ambito, cama }, from: Date, to: Date, internacionId) {
    let start, end;
    if (from.getTime() <= to.getTime()) {
        start = from;
        end = to;
    } else {
        start = to;
        end = from;
    }
    const movement = await CamasEstadosController.searchEstados({ desde: start, hasta: end, organizacion, capa, ambito }, { internacion: internacionId });
    // Porque el movimiento a cambiar de fecha va a ser encontrado
    if (movement.length > 1) {
        return false;
    }
    const valid = await CamasEstadosController.patch({ organizacion, capa, ambito, cama }, from, to);
    return valid;
}
