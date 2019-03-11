import { model as cama } from './../schemas/camas';
import { toArray } from '../../../utils/utils';
import * as moment from 'moment';

export function buscarCamaInternacion(idInternacion, estado) {
    const query = cama.aggregate([
        {
            $project: {
                ultimoEstado: { $arrayElemAt: ['$estados', -1] }, organizacion: 1, sector: 1,
                habitacion: 1, nombre: 1, tipoCama: 1
            }
        },
        { $match: { 'ultimoEstado.estado': estado, 'ultimoEstado.idInternacion': idInternacion } }
    ]);

    return toArray(query.cursor({}).exec());
}

export function buscarPasesCamaXInternacion(idInternacion) {

    let pipelineEstado = [];

    pipelineEstado = [
        { $match: { 'estados.idInternacion': idInternacion } },
        { $unwind: '$estados' },
        { $match: { 'estados.idInternacion': idInternacion, 'estados.esMovimiento': true } },
        { $sort: { 'estados.fecha': 1 } }];

    const query = cama.aggregate(pipelineEstado);

    return toArray(query.cursor({}).exec());
}

/**
 * Devuelve todas las camas ocupadas por unidad organizativa en una fecha dada
 * @param unidadOrganizativa
 * @param fecha
 */
export function camaOcupadasxUO(unidadOrganizativa, fecha, idOrganizacion) {
    let pipelineEstado = [];
    pipelineEstado = [{
        $match: {
            'organizacion._id': idOrganizacion,
            'estados.unidadOrganizativa.conceptId': unidadOrganizativa,
            'estados.fecha': { $lte: fecha },
            'estados.esCensable': true,
            'estados.estado': 'ocupada',
        }
    },
    { $unwind: '$estados' },
    {
        $match: {
            'estados.unidadOrganizativa.conceptId': unidadOrganizativa,
            'estados.fecha': { $lte: fecha },
            'estados.esCensable': true,
            'estados.esMovimiento': true,
            'estados.estado': 'ocupada'
        }
    },
    { $sort: { nombre: 1, 'estados.fecha': 1 } },
    {
        $group: {
            _id: {
                id: '$_id',
                nombre: '$nombre',
                organizacion: '$organizacion',
                tipoCama: '$tipoCama',
                sectores: '$sectores',
                idInternacion: '$estados.idInternacion',
                fechaMovimiento: '$estados.fecha'
            },
            ultimoEstado: { $last: '$estados' }
        }
    },
    { $sort: { 'ultimoEstado.fecha': 1 } }];
    let query = cama.aggregate(pipelineEstado);
    return toArray(query.cursor({}).exec());
}

export async function desocupadaEnDia(dtoCama, fecha) {
    let pipelineEstado = [];
    let ultimoEstadofinDia = moment(dtoCama.ultimoEstado.fecha).endOf('day').toDate();
    let finDiaConsulta = moment(fecha).endOf('day').toDate();
    let inicioDia = moment(fecha).startOf('day').toDate();
    if (finDiaConsulta > ultimoEstadofinDia) {
        pipelineEstado = [
            { $match: { _id: dtoCama._id.id } },
            { $unwind: '$estados' },
            {
                $match: {
                    $and: [{
                        'estados.fecha': {
                            $lte: inicioDia,
                            $gte: dtoCama.ultimoEstado.fecha
                        }
                    }, { 'estados.estado': { $ne: 'ocupada' } }]
                }
            }
        ];
        let data = await toArray(cama.aggregate(pipelineEstado).cursor({}).exec());
        if (data && data.length > 0) {
            return null;
        } else {
            return dtoCama;
        }
    } else {
        return dtoCama;
    }
}
export function camaXInternacion(idInternacion) {
    return new Promise(async (resolve, reject) => {
        let pipelineEstado = [];

        pipelineEstado = [
            { $match: { 'estados.idInternacion': idInternacion } },
            { $unwind: '$estados' },
            { $match: { 'estados.idInternacion': idInternacion } },
            { $sort: { 'estados.fecha': -1 } },
            { $limit: 1 }];

        let data = await toArray(cama.aggregate(pipelineEstado).cursor({}).exec());
        if (data && data.length) {
            cama.findById(data[0]._id).then(res => {
                return resolve(res);
            }).catch(err1 => {
                return reject(err1);
            });
        } else {
            return resolve(null);
        }

    });
}

export function disponibilidadXUO(unidad, fecha, idOrganizacion) {
    return new Promise((resolve, reject) => {
        let inicioDia = moment(fecha).startOf('day').toDate();
        let finDia = moment(fecha).endOf('day').toDate();

        let pipelineInicioDia = [{
            $match: {
                'organizacion._id': idOrganizacion,
                'estados.unidadOrganizativa.conceptId': unidad,
                'estados.fecha': { $lte: inicioDia }
            }
        },
        { $unwind: '$estados' }, {
            $match: {
                'estados.unidadOrganizativa.conceptId': unidad,
                'estados.fecha': { $lte: inicioDia }
            }
        },
        { $sort: { 'estados.fecha': 1 } }, {
            $group: {
                _id: {
                    id: '$_id',
                    nombre: '$nombre',
                    organizacion: '$organizacion',
                    sector: '$sector',
                    habitacion: '$habitacion',
                    tipoCama: '$tipoCama'
                },
                ultimoEstado: { $last: '$estados' }
            }
        },
        { $match: { 'ultimoEstado.unidadOrganizativa.conceptId': unidad, 'ultimoEstado.estado': { $nin: ['bloqueada', 'reparacion', 'ocupada'] } } }];

        let pipelineFinDia = [{
            $match: {
                'organizacion._id': idOrganizacion,
                'estados.unidadOrganizativa.conceptId': unidad,
                'estados.fecha': { $lte: finDia }
            }
        },
        { $unwind: '$estados' }, {
            $match: {
                'estados.unidadOrganizativa.conceptId': unidad,
                'estados.fecha': { $lte: finDia }
            }
        },
        { $sort: { 'estados.fecha': 1 } }, {
            $group: {
                _id: {
                    id: '$_id',
                    nombre: '$nombre',
                    organizacion: '$organizacion',
                    sector: '$sector',
                    habitacion: '$habitacion',
                    tipoCama: '$tipoCama'
                },
                ultimoEstado: { $last: '$estados' }
            }
        },
        { $match: { 'ultimoEstado.estado': { $nin: ['bloqueada', 'reparacion', 'ocupada'] } } }];
        let promises = [
            toArray(cama.aggregate(pipelineInicioDia).cursor({}).exec()),
            toArray(cama.aggregate(pipelineFinDia).cursor({}).exec())
        ];
        return Promise.all(promises).then(([dataIni, dataFin]) => {
            const salida = { disponibilidad0: dataIni.length, disponibilidad24: dataFin.length };
            return resolve(salida);
        }).catch(reject);

    });
}

export async function disponibilidadCenso(unidad, fecha, idOrganizacion) {
    let finDia = moment(fecha).endOf('day').toDate();
    let pipelineFinDia = [{
        $match: {
            'organizacion._id': idOrganizacion,
            'estados.unidadOrganizativa.conceptId': unidad,
            'estados.fecha': { $lte: finDia }
        }
    },
    { $unwind: '$estados' }, {
        $match: {
            'estados.unidadOrganizativa.conceptId': unidad,
            'estados.fecha': { $lte: finDia }
        }
    },
    { $sort: { 'estados.fecha': 1 } }, {
        $group: {
            _id: {
                id: '$_id',
                nombre: '$nombre',
                organizacion: '$organizacion',
                sector: '$sector',
                habitacion: '$habitacion',
                tipoCama: '$tipoCama'
            },
            ultimoEstado: { $last: '$estados' }
        }
    },
    { $match: { 'ultimoEstado.estado': { $nin: ['bloqueada', 'reparacion'] } } }];
    return await toArray(cama.aggregate(pipelineFinDia).cursor({}).exec());
}

export async function getHistorialCama(idOrganizacion, fechaDesde, fechaHasta, idCama) {

    let historial = [];
    historial = [{
        $match: {
            _id: idCama
        }
    },
    { $unwind: '$estados' },
    { $sort: { nombre: 1, 'estados.fecha': -1 } },
    {
        $match: {
            'organizacion._id': idOrganizacion,
            'estados.fecha': {
                $lte: fechaHasta,
                $gte: fechaDesde
            },
        }
    },
    {
        $project: {
            estado: '$estados.estado',
            fecha: '$estados.fecha',
            censable: '$estados.esCensable',
            unidadOrganizativa: '$estados.unidadOrganizativa.term',
            paciente: '$estados.paciente'

        }
    },
    {
        $limit: 30
    },
    ];
    return await cama.aggregate(historial).exec();
}


export async function getInternacionCama(idCama) {
    let internacion = [];
    internacion = [{
        $match: {
            _id: idCama
        }
    },
    { $unwind: '$estados' },
    { $sort: { nombre: 1, 'estados.fecha': -1 } },
    {
        $project: {
            estado: '$estados.estado',
            paciente: '$estados.paciente'

        }
    },
    {
        $match: {
            paciente: { $ne: null }
        }
    },
    ];
    return await cama.aggregate(internacion).exec();
}


export function camasXfecha(idOrganizacion, fecha) {
    return new Promise(async (resolve, reject) => {
        let pipelineEstado = [];

        pipelineEstado = [{
            $match: {
                'organizacion._id': idOrganizacion,
                'estados.fecha': { $lte: fecha }
            }
        },
        { $unwind: '$estados' },
        {
            $match: {
                'estados.fecha': { $lte: fecha },
            }
        },
        { $sort: { 'estados.fecha': 1 } },
        {
            $project: {
                estados: '$estados',
                organizacion: '$organizacion',
                sectores: '$sectores',
                habitacion: '$habitacion',
                nombre: '$nombre',
                tipoCama: '$tipoCama',
                unidadOrganizativaOriginal: '$unidadOrganizativaOriginal',
                equipamiento: '$equipamiento',

            },
        },
        {
            $group:
            {
                _id: { id: '$_id', },
                id: { $last: '$_id' },
                estados: { $push: '$estados' },
                ultimoEstado: { $last: '$estados' },
                organizacion: { $last: '$organizacion' },
                sectores: { $last: '$sectores' },
                habitacion: { $last: '$habitacion' },
                nombre: { $last: '$nombre' },
                tipoCama: { $last: '$tipoCama' },
                unidadOrganizativaOriginal: { $last: '$unidadOrganizativaOriginal' },
                equipamiento: { $last: '$equipamiento' }

            }
        },
        {
            $match: {
                'ultimoEstado.estado': { $ne: 'inactiva' }
            }
        }];
        let camas = await toArray(cama.aggregate(pipelineEstado).cursor({}).exec());
        if (camas && camas.length) {
            return resolve(camas);
        } else {
            return resolve(null);
        }

    });
}
