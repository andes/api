import * as codificacionModel from '../../rup/schemas/codificacion';

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
    if (parametros.profesional) {
        match['createdBy.id'] = parametros.profesional;
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
        }
    ];


    try {
        const prestaciones = codificacionModel.aggregate(pipeline2).cursor({ batchSize: 100 }).exec();
        const resultado = [];
        let os = parametros.financiador ? parametros.financiador : 'todos';
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
