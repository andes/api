import { EventCore } from '@andes/event-bus/';
import { Auth } from '../../../../auth/auth.class';
import { Prestacion } from '../../schemas/prestacion';
import { PlanIndicaionesCtr } from './plan-indicaciones.routes';
import { PlanIndicaciones } from './plan-indicaciones.schema';

EventCore.on('mapa-camas:plan-indicacion:create', async (prestacion) => {

    prestacion = new Prestacion(prestacion);
    const registros = prestacion.getRegistros();

    const idInternacion = prestacion.trackId;
    const fecha = prestacion.ejecucion.fecha;
    const ambito = prestacion.solicitud.ambitoOrigen;
    const paciente = prestacion.paciente;
    registros.filter(r => r.esSolicitud).map(async (registro) => {
        const idRegistro = registro.id;


        const indicacion = await PlanIndicaionesCtr.findOne({ prestacion: prestacion.id, registro: idRegistro });
        if (indicacion) {
            indicacion.valor = registro.valor;
            const user = Auth.getUserFromResource(prestacion);
            Auth.audit(indicacion, user as any);
            await indicacion.save();
        } else {
            const concepto = registro.valor?.medicamento || registro.concepto;

            const _indicacion = new PlanIndicaciones({
                idInternacion,
                idPrestacion: prestacion.id,
                idRegistro,
                fechaInicio: fecha,
                ambito,
                organizacion: prestacion.solicitud.organizacion,
                profesional: prestacion.solicitud.profesional,
                paciente: prestacion.paciente,

                concepto,
                valor: registro.valor,
                estados: [{
                    tipo: 'activo',
                    fecha
                }],

                elementoRUP: registro.elementoRUP

            });
            const user = Auth.getUserFromResource(prestacion);
            Auth.audit(_indicacion, user as any);
            await _indicacion.save();
        }


    });


});
