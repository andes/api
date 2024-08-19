import { Prestacion } from '../../rup/schemas/prestacion';
import * as mongoose from 'mongoose';

/**
 * @export Devuelve las prestaciones fuera de agenda que cumplen con los filtros
 * @param {object} Filtros {rango de fechas, prestación, profesional, financiador, estado}
 * @returns {object} {fecha, paciente, financiador, prestacion, profesionales, estado, idAgenda:null, idBloque:null, turno:null, idPrestacion}
 */
export async function procesar(parametros: any) {
    const indice = 'FUERA-AGENDA';
    const match: any = {
        'ejecucion.fecha': {
            $gte: new Date(parametros.fechaDesde),
            $lte: new Date(parametros.fechaHasta)
        },
        'estadoActual.tipo': 'validada',
        'solicitud.organizacion.id': mongoose.Types.ObjectId(parametros.organizacion),
        'solicitud.tipoPrestacion.noNominalizada': { $ne: true },
        'solicitud.turno': null,
    };

    if (parametros.prestacion) {
        match['solicitud.tipoPrestacion.conceptId'] = parametros.prestacion;
    }

    const matchPaciente = {};

    if (parametros.noNominalizada) {
        match['solicitud.tipoPrestacion.noNominalizada'] = { $eq: true };
    }
    if (parametros.paciente) {
        matchPaciente['$and'] = [{ datosPaciente: { $regex: parametros.paciente.toUpperCase() } }];
    }

    if (parametros.estadoFacturacion) {
        if (parametros.estadoFacturacion === 'Sin comprobante') {
            match['estadoFacturacion'] = { $exists: false };
        } else {
            match['estadoFacturacion.estado'] = parametros.estadoFacturacion;
        }
    }


    if (parametros.profesional) {
        match['solicitud.profesional.id'] = new mongoose.Types.ObjectId(parametros.profesional);
    }
    if (parametros.ambito) {
        match['solicitud.ambitoOrigen'] = parametros.ambito;
    }

    try {
        const prestaciones = Prestacion.aggregate([
            { $match: match },
            {
                $addFields: {
                    datosPaciente: {
                        $concat: [
                            '$paciente.nombre',
                            ' ',
                            '$paciente.apellido',
                            ' ',
                            '$paciente.documento'
                        ]
                    }
                }
            },
            { $match: matchPaciente }]).option({ hint: indice }).allowDiskUse(true).cursor({ batchSize: 100 }).exec();
        const resultado = [];
        const os = parametros.financiador ? parametros.financiador : 'todos';
        const filtroEstado = parametros.estado ? parametros.estado : 'todos';
        await prestaciones.eachAsync(async (prestacion) => {
            let filtroOS = false;
            const registro = prestacion.ejecucion?.registros?.find(x => x.valor?.informe !== null);
            const registroConAdjunto = prestacion.ejecucion?.registros?.find(x => x.nombre === 'documento adjunto');
            const dtoPrestacion = {
                fecha: prestacion.ejecucion.fecha,
                paciente: prestacion.paciente,
                financiador: prestacion.paciente && prestacion.paciente.obraSocial ? prestacion.paciente.obraSocial : null,
                prestacion: prestacion.solicitud.tipoPrestacion,
                profesionales: [prestacion.solicitud.profesional],
                estado: 'Presente con registro del profesional',
                idAgenda: null,
                idBloque: null,
                turno: null,
                idPrestacion: prestacion._id,
                estadoFacturacion: prestacion.estadoFacturacion,
                ambito: prestacion.solicitud?.ambitoOrigen,
                organizacion: prestacion.solicitud?.organizacion,
                actividad: registro.valor?.informe?.tipoActividad?.term,
                tematica: registro.valor?.informe?.tematica,
                pacientes: registro.valor?.informe?.pacientes,
                documentos: registroConAdjunto?.valor?.documentos,
                estadoActual: prestacion.estadoActual
            };

            if (parametros.noNominalizada) {
                resultado.push(dtoPrestacion);
            } else {
                const financiador = prestacion.paciente?.obraSocial?.financiador;

                if (financiador === os || os.includes(financiador) || os === 'todos') {
                    dtoPrestacion['financiador'] = prestacion.paciente.obraSocial;
                    filtroOS = true;
                } else {
                    if (prestacion?.paciente?.obraSocial === 'SUMAR' && os === 'SUMAR') {
                        dtoPrestacion['financiador'] = prestacion.paciente.obraSocial;
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
            }
        });
        return resultado;
    } catch (error) {
        return (error);
    }
}
