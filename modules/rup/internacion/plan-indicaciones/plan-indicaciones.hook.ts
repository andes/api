import { EventCore } from '@andes/event-bus/';
import { Auth } from '../../../../auth/auth.class';
import { Prestacion } from '../../schemas/prestacion';
import { PlanIndicaionesCtr } from './plan-indicaciones.routes';

EventCore.on('mapa-camas:plan-indicacion:create', async (prestacion) => {


    prestacion = new Prestacion(prestacion);
    const registros = prestacion.getRegistros();

    const idInternacion = prestacion.trackId;
    const fecha = prestacion.ejecucion.fecha;
    const ambito = prestacion.solicitud.ambitoOrigen;
    registros.filter(r => r.esSolicitud).map(async (registro) => {
        const idRegistro = registro.id;
        const idEvolucion = registro.idEvolucion;
        const indicacion = await PlanIndicaionesCtr.findOne({ registro: idRegistro });

        if (indicacion) {
            indicacion.idPrestacion = prestacion.id;
            indicacion.estados.push({
                tipo: 'active',
                fecha
            });
            // indicacion.valor = registro.valor;
            const user = Auth.getUserFromResource(prestacion);
            Auth.audit(indicacion, user as any);
            await indicacion.save();
        } else {
            // const nombre = registro.valor?.medicamento?.term || registro.concepto.term;

            // const _indicacion = new PlanIndicaciones({
            //     idInternacion,
            //     idPrestacion: prestacion.id,
            //     idRegistro,
            //     fechaInicio: fecha,
            //     ambito,
            //     organizacion: prestacion.solicitud.organizacion,
            //     profesional: prestacion.solicitud.profesional,
            //     paciente: prestacion.paciente,
            //     nombre,
            //     concepto: registro.concepto,
            //     valor: registro.valor,
            //     estados: [{
            //         tipo: 'active',
            //         fecha
            //     }],

            //     elementoRUP: registro.elementoRUP,
            //     seccion: registro.seccion

            // });
            // const user = Auth.getUserFromResource(prestacion);
            // Auth.audit(_indicacion, user as any);
            // await _indicacion.save();

            // if (idEvolucion) {
            //     const indicacionModificada = await PlanIndicaionesCtr.findOne({ registro: idEvolucion });
            //     if (indicacionModificada) {
            //         indicacionModificada.fechaBaja = fecha;
            //         indicacionModificada.estados.push({
            //             tipo: 'edited',
            //             fecha
            //         });
            //         Auth.audit(indicacionModificada, user as any);
            //         await indicacionModificada.save();
            //     }

            // }
        }


    });


});
