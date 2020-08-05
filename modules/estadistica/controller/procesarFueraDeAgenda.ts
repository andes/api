import { Prestacion } from '../../rup/schemas/prestacion';
import * as mongoose from 'mongoose';

/**
 * @export Devuelve las prestaciones fuera de agenda que cumplen con los filtros
 * @param {object} Filtros {rango de fechas, prestación, profesional, financiador, estado}
 * @returns {object} {fecha, paciente, financiador, prestacion, profesionales, estado, idAgenda:null, idBloque:null, turno:null, idPrestacion}
 */
export async function procesar(parametros: any) {

    let match: any = {
        $and: [
            { createdAt: { $gte: new Date(parametros.fechaDesde) } },
            { createdAt: { $lte: new Date(parametros.fechaHasta) } }
        ],
        'solicitud.turno': { $exists : false },
        'createdBy.organizacion._id': String(parametros.organizacion)
    };

    if (parametros.documento) {
        match['paciente.documento'] = parametros.documento;
    }

    if (parametros.estadoFacturacion) {
        if (parametros.estadoFacturacion === 'Sin comprobante') {
            match['estadoFacturacion'] = { $exists: false };
        } else {
            match['estadoFacturacion.estado'] = parametros.estadoFacturacion;
        }
    }

    if (parametros.prestacion) {
        match['solicitud.tipoPrestacion.id'] = new mongoose.Types.ObjectId(parametros.prestacion);
    }
    if (parametros.profesional) {
        match['solicitud.profesional.id'] = new mongoose.Types.ObjectId(parametros.profesional);
    }
    if (parametros.ambito) {
        match2['prestacion.solicitud.ambitoOrigen'] = parametros.ambito;
    }


    try {
        const prestaciones = Prestacion.aggregate([{ $match: match }]).cursor({ batchSize: 100 }).exec();
        const resultado = [];
        let os = parametros.financiador ? parametros.financiador : 'todos';
        let filtroEstado = parametros.estado ? parametros.estado : 'todos';
        await prestaciones.eachAsync(async (prestacion, error) => {
            let filtroOS = false;
            let dtoPrestacion = {
                fecha: prestacion.ejecucion.fecha,
                paciente: prestacion.paciente,
                financiador: prestacion.paciente && prestacion.paciente.obraSocial ? prestacion.paciente.obraSocial : null,
                prestacion: prestacion.solicitud.tipoPrestacion,
                profesionales: [prestacion.solicitud.profesional],
                estado: 'Presente con registro del profesional',
                idAgenda: null,
                idBloque: null,
                turno: null,
                idPrestacion: prestacion.idPrestacion,
                estadoFacturacion: prestacion.estadoFacturacion,
                ambito: prestacion.prestacion.solicitud.ambitoOrigen
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
