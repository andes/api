import { logPaciente } from '../core/log/schemas/logPaciente';

export class LoggerPaciente {

    public static logTurno(req, op, paciente, turno, bloque, agenda, callback?): any {
        let newLogTurno = new logPaciente({
            paciente: paciente.id,
            operacion: op,
            createdAt: new Date(),
            dataTurno: {
                turno: turno,
                idBloque: bloque,
                idAgenda: agenda
            },
            createdBy: req.user.usuario

        });
        newLogTurno.save(callback);
        return newLogTurno;
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
            createdBy: req.user.usuario
        });
        newLogNotificacion.save(callback);
        return newLogNotificacion;
    }


}
