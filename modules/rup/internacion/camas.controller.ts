import { Camas, INTERNACION_CAPAS } from './camas.schema';
import * as CamasEstadosController from './cama-estados.controller';
import moment = require('moment');
import { EstadosCtr } from './estados.routes';

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

type CAMA = any;
export async function patch(data: CAMA) {

    const estadoCama = await findById({ organizacion: data.organizacion, capa: data.capa, ambito: data.ambito }, data.id, data.fecha);

    const maquinaEstado = await EstadosCtr.encontrar(data.organizacion._id, data.ambito, data.capa);

    const cambioPermitido = await maquinaEstado.check(estadoCama.estado, data.estado);

    if (cambioPermitido) {
        const nuevoEstado = {
            ...estadoCama,
            ...data
        };

        const [camaEncontrada, cats]: [any, any] = await Promise.all([
            Camas.findById(data.id),
            CamasEstadosController.store({ organizacion: data.organizacion._id, ambito: data.ambito, capa: data.capa, cama: data.id }, nuevoEstado),
        ]);

        camaEncontrada.set(data);
        if (data.unidadOrganizativa) {
            camaEncontrada.unidadOrganizativaOriginal = data.unidadOrganizativa;
        }

        return await camaEncontrada.save();
    }

    return null;
}

export async function store(data) {
    const nuevaCama = new Camas({
        organizacion: data.organizacion,
        ambito: data.ambito,
        unidadOrganizativaOriginal: data.unidadOrganizativa,
        sectores: data.sectores,
        nombre: data.nombre,
        tipoCama: data.tipoCama,
        equipamiento: data.equipamiento,
    });

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
            return CamasEstadosController.store({ organizacion: data.organizacion.id, ambito: data.ambito, capa, cama: nuevaCama._id }, nuevoEstado);
        })
    ]);

    return camaGuardada;
}
