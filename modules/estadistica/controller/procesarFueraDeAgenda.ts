import * as codificacionModel from '../../rup/schemas/codificacion';
import * as mongoose from 'mongoose';

/**
 * @export Devuelve las prestaciones fuera de agenda que cumplen con los filtros
 * @param {object} Filtros {rango de fechas, prestación, profesional, financiador, estado}
 * @returns {object} {fecha, paciente, financiador, prestacion, profesionales, estado, idAgenda:null, idBloque:null, turno:null, idPrestacion}
 */
export async function procesar(parametros: any) {

    let pipeline2 = [];

    let match = {
        $and: [
            { createdAt: { $gte: new Date(parametros.fechaDesde) } },
            { createdAt: { $lte: new Date(parametros.fechaHasta) } }
        ],
        'createdBy.organizacion._id': String(parametros.organizacion)
    };
    let match2 = {};

    if (parametros.prestacion) {
        match2 = { 'prestacion.solicitud.tipoPrestacion.id': new mongoose.Types.ObjectId(parametros.prestacion) };
    }
    if (parametros.profesional) {
        match2 = { 'prestacion.solicitud.profesional.id': new mongoose.Types.ObjectId(parametros.profesional) };
    }
    pipeline2 = [
        {
            $match: match
        },
        {
            $lookup: {
                from: 'prestaciones',
                localField: 'idPrestacion',
                foreignField: '_id',
                as: 'prestacion'
            }
        },
        {
            $unwind: '$prestacion',
        },
        {
            $match: match2
        }
    ];

    try {
        const prestaciones = codificacionModel.aggregate(pipeline2).cursor({ batchSize: 100 }).exec();
        const resultado = [];
        let os = parametros.financiador ? parametros.financiador : 'todos';
        let filtroEstado = parametros.estado ? parametros.estado : 'todos';
        await prestaciones.eachAsync(async (prestacion, error) => {
            let dtoPrestacion = {
                fecha: prestacion.createdAt,
                paciente: prestacion.paciente,
                financiador: prestacion.paciente && prestacion.paciente.obraSocial ? prestacion.paciente.obraSocial : null,
                prestacion: prestacion.prestacion.solicitud.tipoPrestacion,
                profesionales: [prestacion.prestacion.solicitud.profesional],
                estado: 'Presente con registro del profesional',
                idAgenda: null,
                idBloque: null,
                turno: null,
                idPrestacion: prestacion.idPrestacion,
            };
            if (dtoPrestacion.financiador && dtoPrestacion.financiador.financiador === os || os === 'todos') {
                if (filtroEstado === dtoPrestacion.estado || filtroEstado === 'todos') {
                    resultado.push(dtoPrestacion);
                }
            }
            if (error) {
                return error;
            }
        });
        return resultado;
    } catch (error) {
        return (error);
    }
}
