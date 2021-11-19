import { EventCore } from '@andes/event-bus';
import { Types } from 'mongoose';
import { InternacionResumen } from './internacion-resumen.schema';

EventCore.on('mapa-camas:paciente:undo', async movimiento => {
    if (movimiento.capa && movimiento.capa === 'estadistica') { return; }


    await InternacionResumen.updateOne(
        { _id: Types.ObjectId(movimiento.idInternacion) },
        {
            $set: {
                deletedAt: new Date()
            }
        }
    );
});

EventCore.on('mapa-camas:paciente:triage', async ({ prestacion, registro }) => {
    if (prestacion.trackId && prestacion.solicitud.ambitoOrigen === 'guardia') {

        const resumen = await InternacionResumen.findById(prestacion.trackId);


        switch (registro.valor.conceptId) {
            case '394848005':
                resumen.prioridad = { id: 1, label: 'BAJA', type: 'success' };
                break;
            case '1331000246106':
                resumen.prioridad = { id: 50, label: 'MEDIA', type: 'warning' };
                break;
            case '394849002':
                resumen.prioridad = { id: 100, label: 'ALTA', type: 'danger' };
                break;
        }

        resumen.fechaAtencion = prestacion.ejecucion.fecha;

        await resumen.save();

    }
});

EventCore.on('internacion:conceptos:agregar', async (prestacion) => {
    const registros = prestacion.ejecucion.registros[0].registros[5].registros;
    const query = { 'paciente.id': prestacion.paciente.id };

    const resumenes = await InternacionResumen.find(query);
    const resumen = resumenes[resumenes.length - 1];
    resumen.diagnostico.registros = registros;
    resumen.diagnostico.principal = registros.find(registro => registro.esDiagnosticoPrincipal);
    await InternacionResumen.findOneAndUpdate({ _id: resumen._id }, resumen);

});


