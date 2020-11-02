import { EventCore } from '@andes/event-bus';
import { Types } from 'mongoose';
import { InternacionResumen } from './internacion-resumen.schema';

EventCore.on('mapa-camas:paciente:ingreso', async movimiento => {
    if (movimiento.capa && movimiento.capa === 'estadistica') { return; }

    await InternacionResumen.updateOne(
        { _id: Types.ObjectId(movimiento.idInternacion) },
        {
            $setOnInsert: {
                _id: Types.ObjectId(movimiento.idInternacion),
                ambito: movimiento.ambito,
                paciente: movimiento.paciente,
                organizacion: {
                    id: movimiento.organizacion._id || movimiento.organizacion.id,
                    nombre: movimiento.organizacion.nombre,
                }
            },
            $set: {
                fechaIngreso: movimiento.fecha
            }
        },
        { upsert: true }
    );
});

EventCore.on('mapa-camas:paciente:egreso', async movimiento => {
    if (movimiento.capa && movimiento.capa === 'estadistica') { return; }

    const idInternacion = movimiento.extras?.idInternacion || movimiento.idInternacion;
    const tipo_egreso = movimiento.extras?.tipo_egreso;

    await InternacionResumen.updateOne(
        { _id: Types.ObjectId(idInternacion) },
        {
            $setOnInsert: {
                _id: Types.ObjectId(idInternacion),
                ambito: movimiento.ambito,
                paciente: movimiento.paciente,
                organizacion: {
                    id: movimiento.organizacion._id || movimiento.organizacion.id,
                    nombre: movimiento.organizacion.nombre,
                }
            },
            $set: {
                tipo_egreso,
                fechaEgreso: movimiento.fecha
            }
        },
        { upsert: true }
    );
});

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
