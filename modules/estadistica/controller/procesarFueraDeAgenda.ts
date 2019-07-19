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

    if (parametros.estadoFacturacion) {
        if (parametros.estadoFacturacion === 'Sin comprobante') {
            match['estadoFacturacion'] = { $exists: false };
        } else {
            match['estadoFacturacion.estado'] = parametros.estadoFacturacion;
        }

    }
    let match2 = {};

    if (parametros.prestacion) {
        match2 = { 'prestacion.solicitud.tipoPrestacion.id': new mongoose.Types.ObjectId(parametros.prestacion) };
    }
    if (parametros.profesional) {
        match2 = { 'prestacion.solicitud.profesional.id': new mongoose.Types.ObjectId(parametros.profesional) };
    }

    // if (parametros.estadoFacturacion) {
    //     match2['estadoFacturacion.estado'] = parametros.estadoFacturacion;
    // }
    if (parametros.estadoFacturacion) {
        if (parametros.estadoFacturacion === 'Sin comprobante') {
            match2['estadoFacturacion'] = { $exists: false };
        } else {
            match2['estadoFacturacion.estado'] = parametros.estadoFacturacion;
        }

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
            let filtroOS = false;
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
                estadoFacturacion: prestacion.estadoFacturacion
            };

            if (prestacion.paciente && prestacion.paciente.obraSocial === os || os === 'todos') {
                dtoPrestacion['financiador'] = prestacion.paciente.obraSocial;
                filtroOS = true;
            } else {

                if (prestacion.paciente && prestacion.paciente.obraSocial && prestacion.paciente.obraSocial.financiador === os && os === 'SUMAR') {
                    dtoPrestacion['financiador'] = prestacion.paciente.obraSocial.financiador;
                    filtroOS = true;
                } else {
                    if (prestacion.paciente && !prestacion.paciente.obraSocial && os === 'No posee') {
                        filtroOS = true;
                    } else {
                        filtroOS = false;
                    }
                }
            }

            if (filtroOS === true && (filtroEstado === dtoPrestacion.estado || filtroEstado === 'todos')) {
                resultado.push(dtoPrestacion);
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
