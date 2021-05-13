import { EventCore } from '@andes/event-bus/';
import { FormsEpidemiologia } from '../forms-epidemiologia-schema';
import * as mongoose from 'mongoose';

export async function updateField(id, body) {
    const { seccion, fields } = body;
    const ficha: any = await FormsEpidemiologia.findById(mongoose.Types.ObjectId(id));
    const seccionObj = ficha.secciones.find(s => s.name === seccion);

    fields.forEach(f => {
        const entries = Object.entries(f).map(([key, value]) => ({ key, value }));
        const entry = entries[0];
        const foundField = seccionObj.fields.find(f2 => Object.keys(f2)[0] === entry.key);
        if (foundField) {
            foundField[entry.key] = entry.value;
        }
    });

    return ficha;
}

export async function getLAMPPendientes() { 
    return await FormsEpidemiologia.find({ 'secciones.fields.lamp.id': 'muestra' });
}

export async function importLAMPResults() {
    const lamps = await this.getLAMPPendientes();
    EventCore.emitAsync('notificacion:epidemio:lamp', lamps);
}
