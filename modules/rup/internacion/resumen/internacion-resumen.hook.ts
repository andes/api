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

EventCore.on('rup:internacion:valoracion-inicial', async (prestacion) => {

    const registroIngreso = prestacion.ejecucion.registros.find(registro => registro.concepto.conceptId === '6451000013102');
    const registrosDiagnostico = registroIngreso.registros.find(registroSeccion => registroSeccion.concepto.conceptId === '2941000246106');
    const query = { _id: prestacion.trackId };
    const resumen = await InternacionResumen.findOne(query);

    if (registrosDiagnostico.registros.length) {
        resumen.registros = resumen.registros || [];

        const registros = registrosDiagnostico.registros.map(r => {
            return {
                tipo: 'valoracion-inicial',
                idPrestacion: prestacion._id,
                concepto: r.concepto,
                esDiagnosticoPrincipal: r.esDiagnosticoPrincipal,
                valor: r.valor
            };
        });

        resumen.registros.push(...registros);
        await InternacionResumen.findOneAndUpdate({ _id: resumen._id }, resumen);
    }

});

EventCore.on('rup:internacion:epicrisis', async (prestacion) => {
    const registroAlta = prestacion.ejecucion.registros.find(registro => registro.concepto.conceptId === '373942005');
    const registrosDiagnostico = registroAlta.registros.find(registroSeccion => registroSeccion.concepto.conceptId === '3641000013106');
    const query = { _id: prestacion.trackId };
    const resumen = await InternacionResumen.findOne(query);
    if (registrosDiagnostico.registros.length) {

        resumen.registros = resumen.registros || [];

        const registros = registrosDiagnostico.registros.map(r => {
            return {
                tipo: 'epicrisis',
                idPrestacion: prestacion._id,
                concepto: r.concepto,
                esDiagnosticoPrincipal: r.esDiagnosticoPrincipal,
                valor: r.valor
            };
        });

        resumen.registros.push(...registros);
        await InternacionResumen.findOneAndUpdate({ _id: resumen._id }, resumen);

    }
});

EventCore.on('rup:internacion:valoracion-inicial:cancel', async (prestacion) => {
    const query = { _id: prestacion.trackId };
    await InternacionResumen.updateOne(
        { _id: prestacion.trackId },
        {
            $pull: {
                registros: { idPrestacion: prestacion._id }
            }
        }
    );

});


