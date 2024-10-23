import { Types } from 'mongoose';
import { Prestacion } from '../../../../modules/rup/schemas/prestacion';

export async function getSolicitudes(pacienteId, prestacionId) {
    const solicitudes = await Prestacion.aggregate([
        {
            $match: {
                $and: [
                    { inicio: 'top' },
                    { 'paciente.id': Types.ObjectId(pacienteId) },
                    {
                        'estadoActual.tipo': {
                            $in: [
                                'pendiente',
                                'auditoria'
                            ]
                        }
                    },
                    {
                        'solicitud.tipoPrestacion.conceptId': prestacionId
                    },
                ]
            }
        },
        { $sort: { createdAt: -1 } }
    ]);

    return solicitudes;
}
