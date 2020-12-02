import { EventCore } from '@andes/event-bus';
import { Types } from 'mongoose';
import { InternacionResumen } from './internacion-resumen.schema';

// EventCore.on('mapa-camas:paciente:ingreso', async movimiento => {
//     if (movimiento.capa && movimiento.capa === 'estadistica') { return; }

//     const metadata = movimiento.metadata || [];
//     const prioridad = (metadata.find(r => r.concepto.conceptId === '225390008') || {}).valor;


//     await InternacionResumen.updateOne(
//         { _id: Types.ObjectId(movimiento.idInternacion) },
//         {
//             $setOnInsert: {
//                 _id: Types.ObjectId(movimiento.idInternacion),
//                 ambito: movimiento.ambito,
//                 paciente: movimiento.paciente,
//                 organizacion: {
//                     id: movimiento.organizacion._id || movimiento.organizacion.id,
//                     nombre: movimiento.organizacion.nombre,
//                 }
//             },
//             $set: {
//                 fechaIngreso: movimiento.fecha,
//                 metadata: movimiento.metadata,
//                 prioridad
//             }
//         },
//         { upsert: true }
//     );
// });

// EventCore.on('mapa-camas:paciente:egreso', async movimiento => {
//     if (movimiento.capa && movimiento.capa === 'estadistica') { return; }

//     const idInternacion = movimiento.extras?.idInternacion || movimiento.idInternacion;
//     const tipo_egreso = movimiento.extras?.tipo_egreso;

//     await InternacionResumen.updateOne(
//         { _id: Types.ObjectId(idInternacion) },
//         {
//             $setOnInsert: {
//                 _id: Types.ObjectId(idInternacion),
//                 ambito: movimiento.ambito,
//                 paciente: movimiento.paciente,
//                 organizacion: {
//                     id: movimiento.organizacion._id || movimiento.organizacion.id,
//                     nombre: movimiento.organizacion.nombre,
//                 }
//             },
//             $set: {
//                 tipo_egreso,
//                 fechaEgreso: movimiento.fecha
//             }
//         },
//         { upsert: true }
//     );
// });

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
