import { Camas } from './camas.schema';
import * as CamasEstadosController from './cama-estados.controller';
import moment = require('moment');
import { EstadosCtr } from './estados.routes';
import { CamaEstados } from './cama-estados.schema';

export async function search({ organizacion, capa, ambito }, params) {
    let timestamp = moment();

    if (params.timestamp) {
        timestamp = moment(params.timestamp);
    }

    return await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion, ambito, capa }, params);
}

export async function findById({ organizacion, capa, ambito }, idCama, timestamp) {
    if (!timestamp) {
        timestamp = moment();
    }

    const estadoCama = await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion, ambito, capa }, { idCama, timestamp });

    if (estadoCama.length > 0) {
        return estadoCama[0];
    }

    return null;
}

export async function patch(data) {
    const estadoCama = await findById({ organizacion: data.organizacion._id, ambito: data.ambito, capa: data.capa }, data.cama, data.estado.fecha);

    const maquinaEstado = await EstadosCtr.encontrar(data.organizacion._id, data.ambito, data.capa);

    const cambioPermitido = await maquinaEstado.check(estadoCama.estado, data.estado);

    if (cambioPermitido) {
        const nuevoEstado = {
            ...estadoCama,
            ...data.estado
        };

        const [camaEncontrada] = await Promise.all([
            Camas.findById(data.cama._id),
            CamasEstadosController.store({ organizacion: data.organizacion._id, ambito: data.ambito, capa: data.capa, cama: data.cama }, nuevoEstado),
        ]);

        camaEncontrada.set({
            organizacion: data.organizacion,
            ambito: data.ambito,
            unidadOrganizativaOriginal: data.unidadOrganizativa,
            sectores: data.sectores,
            nombre: data.nombre,
            tipoCama: data.tipoCama,
            equipamiento: data.equipamiento,
        });

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

    const nuevoEstado = {
        fecha: moment().toDate(),
        estado: 'disponible',
        unidadOrganizativa: data.unidadOrganizativa,
        especialidades: data.especialidades,
        genero: data.genero,
        esCensable: data.censable,
        esMovimiento: data.movimiento,
    };

    const [camaGuardada] = await Promise.all([
        nuevaCama.save(),
        CamasEstadosController.store({ organizacion: data.organizacion, ambito: data.ambito, capa: 'medica', cama: nuevaCama._id }, nuevoEstado),
        CamasEstadosController.store({ organizacion: data.organizacion, ambito: data.ambito, capa: 'enfermeria', cama: nuevaCama._id }, nuevoEstado),
        CamasEstadosController.store({ organizacion: data.organizacion, ambito: data.ambito, capa: 'estadistica', cama: nuevaCama._id }, nuevoEstado),
    ]);

    return camaGuardada;
}
