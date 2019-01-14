import moment = require('moment');
import { model as Prestacion } from '../modules/rup/schemas/prestacion';
import * as codificacionController from '../modules/rup/controllers/codificacionController';
import { codificacion } from '../modules/rup/schemas/codificacion';
import { Auth } from '../auth/auth.class';

async function run(done) {
    const fechaDesde = moment(new Date(2018, 11, 1)); // mes - 1
    const fechaHAsta = moment(new Date(2018, 11, 18)); // mes - 1
    const start = (moment(fechaDesde).startOf('day')).format('YYYY-MM-DD HH:mm:ss');
    const end = (moment(fechaHAsta).endOf('day')).format('YYYY-MM-DD HH:mm:ss');
    await migrarFueraAgenda(done, start, end);
}

/**
 * funcion que controla los vencimientos de la matriculas y de ser necesario envia sms y email avisando al profesional.
 */
async function migrarFueraAgenda(done, start, end) {
    const parametros = {
        $where: 'this.estados[this.estados.length - 1].tipo ==  "validada"',
        'solicitud.turno': null,
        $and: [
            { createdAt: { $gte: new Date(start) } },
            { createdAt: { $lte: new Date(end) } }
        ],
    };
    try {
        const prestaciones = await Prestacion.find(parametros).cursor({ batchSize: 100 });
        await prestaciones.eachAsync(async (prestacion) => {
            const codificaciones = await codificacionController.codificarPrestacion(prestacion);
            let data = new codificacion({
                createdAt: (prestacion as any).ejecucion.fecha,
                createdBy: (prestacion as any).createdBy,
                idPrestacion: prestacion._id,
                paciente: (prestacion as any).paciente,
                diagnostico: {
                    codificaciones
                }
            });
            let usuario = {
                user: {
                    usuario: {
                        nombre: 'Migracion fuera de agenda',
                        apellido: 'Scheduler'
                    },
                    organizacion: {
                        nombre: 'Migracion'
                    }
                },
                ip: '0.0.0.0',
                connection: {
                    localAddress: '0.0.0.0'
                }
            };
            Auth.audit(data, (usuario as any));
            await data.save((err) => {
                if (err) {
                    return (err);
                }
            });
        });
        done();

    } catch (error) {
        return (done(error));
    }
}

export = run;
