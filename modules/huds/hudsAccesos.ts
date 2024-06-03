import { HudsAcceso } from './hudsAccesos.schema';
import * as moment from 'moment';


export async function logAcceso(req, paciente, matricula, motivo, idTurno, idPrestacion, detalleMotivo) {
    let bucketNumber = 0;
    let retry = true;
    while (retry) {
        try {
            await execLog(req, paciente, matricula, motivo, idTurno, idPrestacion, bucketNumber, detalleMotivo);
            retry = false;
        } catch (err) {
            if (err.code === 17419) {
                bucketNumber++;
            } else {
                retry = false;
                throw new Error(err);
            }
        }
    }
}

async function execLog(req, paciente, matricula, motivoAcceso, turno, prestacion, bucketNumber, detalleMotivo) {
    const now = new Date();
    const start = moment(now).startOf('year') as unknown as number;
    return HudsAcceso.update(
        {
            paciente,
            start,
            bucketNumber
        },
        {
            $inc: { cantidadAccesos: 1 },
            $setOnInsert: {
                paciente,
                start,
                bucketNumber
            },
            $push: {
                accesos: {
                    fecha: now,
                    usuario: user(req),
                    matricula,
                    motivoAcceso,
                    detalleMotivo,
                    turno,
                    prestacion,
                    organizacion: organizacion(req),
                    cliente: {
                        ip: req.ip,
                        userAgent: req.useragent
                    }
                }
            }
        },
        { upsert: true }
    );
}

function user(request) {
    if (!request || !request.user || !request.user.usuario) {
        throw new Error('Usuario requerido');
    }
    return request.user.usuario;
}
function organizacion(request) {
    if (!request || !request.user || !request.user.organizacion) {
        throw new Error('Organizacion requerida');
    }
    return request.user && request.user.organizacion;
}
