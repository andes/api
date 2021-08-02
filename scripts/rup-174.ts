
import { Prestacion } from '../modules/rup/schemas/prestacion';


function getInicioPrestacion(prestacion) {
    let inicioPrestacion;
    const estadoInicial = prestacion.estados[0];
    if (estadoInicial.tipo === 'pendiente' || estadoInicial.tipo === 'auditoria') {
        inicioPrestacion = 'top';
    } else if (estadoInicial.tipo === 'ejecucion') {
        if (prestacion.solicitud.turno) {
            inicioPrestacion = 'agenda';
        } else if (prestacion.solicitud.ambitoOrigen === 'ambulatorio') {
            inicioPrestacion = 'fuera-agenda';
        } else if (prestacion.solicitud.ambitoOrigen === 'internacion') {
            inicioPrestacion = 'internacion';
        }
    }

    return inicioPrestacion;
}


async function run(done) {
    const prestaciones = Prestacion.find().select('estados solicitud inicio').cursor({ batchSize: 100 });
    let i = 0;
    for await (const prestacion of prestaciones) {
        i++;
        // eslint-disable-next-line no-console
        if (i % 1000 === 0) { console.log(i); }
        if (!prestacion.inicio) {
            const inicio = getInicioPrestacion(prestacion);

            await Prestacion.update(
                { _id: prestacion._id },
                { $set: { inicio } }
            );
        }
    }
    done();
}

export = run;
