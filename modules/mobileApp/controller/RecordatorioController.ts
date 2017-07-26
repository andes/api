import { recordatorio } from '../schemas/recordatorio';

let async = require('async');

export function guardarRecordatorioTurno(turnos: any[], callback) {

    async.forEach(turnos, function (turno, callback) {

        let recordatorioTurno = new recordatorio({
            idTurno: turno._id,
            fechaTurno: turno.horaInicio,
            paciente: turno.paciente,
            tipoRecordatorio: turno.tipoRecordatorio,
            estadoEnvio: false,
        });
        
        recordatorio.findOne({ idTurno: recordatorioTurno.idTurno }, function (err, turno) {
            console.log("Turnosss ", turno);
            if (turno) {
                // return res.status(422).send({ 'email': 'El e-mail ingresado está en uso' });
                console.log("El recordatorio existe");
            }

            recordatorioTurno.save(function (err, user: any) {

                if (err) {
                    return callback(err);
                }

                return callback(turno);
            });

        });
    });
}