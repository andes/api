import * as codificacionModel from '../../rup/schemas/codificacion';

export async function procesar(parametros: any) {
    let pipeline2 = [];

    let match = {
        $and: [
            // { $or: orgExcluidas },
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
        await prestaciones.eachAsync(async (prestacion, error) => {
            // console.log('prestacion ', prestacion);
            let dtoPrestacion = {
                idPrestacion: prestacion.idPrestacion,
                prestacion: prestacion.prestacion.solicitud.tipoPrestacion,
                fecha: prestacion.createdAt,
                paciente: prestacion.paciente,
                profesionales: [prestacion.prestacion.solicitud.profesional],
            };
            resultado.push(dtoPrestacion);
            // console.log('resultado ', resultado);
            if (error) {
                return error;
            }
        });
        return resultado;
    } catch (error) {
        return (error);
    }
}
