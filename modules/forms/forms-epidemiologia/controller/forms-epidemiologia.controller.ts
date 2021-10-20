import { EventCore } from '@andes/event-bus/';
import * as mongoose from 'mongoose';
import { FormsEpidemiologia } from '../forms-epidemiologia-schema';
import { FormEpidemiologiaCtr } from '../forms-epidemiologia.routes';
import { userScheduler } from '../../../../config.private';

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
    EventCore.emitAsync('notificacion:epidemio:lamp', { lamps } );
}

export async function updateFichaCodigoSisa(fichaId, _codigoSisa) {
    const ficha: any = await FormsEpidemiologia.findById(fichaId);
    const secciones = ficha.secciones;
    let seccionOperaciones = secciones.find(s => s.name === 'Operaciones');

    if (!seccionOperaciones) {
        seccionOperaciones = {
            name: 'Operaciones',
            fields: []
        };
        secciones.push(seccionOperaciones);
    }

    let fieldSisa = seccionOperaciones.fields.find(f => f.codigoSisa);
    if (!fieldSisa) {
        fieldSisa = {
            codigoSisa: null
        };
        seccionOperaciones.fields.push(fieldSisa);
    }

    fieldSisa.codigoSisa = _codigoSisa;

    return FormEpidemiologiaCtr.update(fichaId, ficha, userScheduler as any);
}
