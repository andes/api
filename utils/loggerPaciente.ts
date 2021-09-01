import { logPaciente } from '../core/log/schemas/logPaciente';

export class LoggerPaciente {

    public static logTurno(req, op, paciente, turno, bloque, agenda, callback?): any {
        const model: any = {
            operacion: op,
            paciente: (paciente && paciente.id) ? paciente.id : null, // Un turno puede tener o no tener paciente
            createdAt: new Date(),
            dataTurno: {
                turno,
                idBloque: bloque,
                idAgenda: agenda._id,
                profesionales: agenda.profesionales
            },
            createdBy: req.user.usuario || req.user
        };

        if (req.body.observaciones) {
            model.observaciones = req.body.observaciones;
        }
        const newLogPaciente = new logPaciente(model);
        newLogPaciente.save(callback);
        return newLogPaciente;

    }

    public static logNotificacion(req, op, paciente, texto, medios, callback?): any {
        const newLogNotificacion = new logPaciente({
            paciente: paciente.id,
            operacion: op,
            notificacion: {
                texto,
                medios
            },
            createdAt: new Date(),
            createdBy: req.user.usuario || req.user
        });
        newLogNotificacion.save(callback);
        return newLogNotificacion;
    }

    public static logReporteError(req, op, paciente, err): any {
        const newLogReporteError = new logPaciente({
            paciente: paciente.id,
            operacion: op,
            error: err,
            createdAt: new Date(),
            createdBy: req.user.usuario || req.user
        });
        newLogReporteError.save();
        return newLogReporteError;
    }
}
