import { logPaciente } from '../core/log/schemas/logPaciente';

export class LoggerPaciente {

    public static logTurno(req, op, paciente, turno, bloque, agenda, callback?): any {

        let newLogPaciente = new logPaciente({
            operacion: op,
            paciente: paciente._id ? paciente._id : {}, // Un turno puede tener o no tener paciente
            createdAt: new Date(),
            dataTurno: {
                turno: turno,
                idBloque: bloque,
                idAgenda: agenda
            },
            createdBy: req.user.usuario || req.user

        });
        newLogPaciente.save(callback);
        return newLogPaciente;

    }

    public static logNotificacion(req, op, paciente, texto, medios, callback?): any {
        let newLogNotificacion = new logPaciente({
            paciente: paciente.id,
            operacion: op,
            notificacion: {
                texto: texto,
                medios: medios
            },
            createdAt: new Date(),
            createdBy: req.user.usuario || req.user
        });
        newLogNotificacion.save(callback);
        return newLogNotificacion;
    }


}
