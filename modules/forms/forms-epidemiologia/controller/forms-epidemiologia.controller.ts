import { EventCore } from '@andes/event-bus/';
import { calcularEdad } from './../../../../core-v2/mpi/paciente/paciente.schema';
import { SECCION_CLASIFICACION, SECCION_ENFERMEDADES_PREVIAS } from '../constantes';
import { FormsEpidemiologia } from '../forms-epidemiologia-schema';
import * as mongoose from 'mongoose';
import { FormCtr } from '../../../../modules/forms/forms.routes';
import moment = require('moment');

export async function updateField(id, seccion, fields) {
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
    EventCore.emitAsync('notificacion:epidemio:lamp', { lamps });
}

async function getScoreComorbilidades(ficha) {
    const enfermedadesFields = ficha.secciones.find(s => s.name === SECCION_ENFERMEDADES_PREVIAS)?.fields;
    const presentaComorbilidades = enfermedadesFields?.find(f => f.presenta)?.presenta;
    let score = 0;

    if (presentaComorbilidades) {
        const fichaTemplate: any = await FormCtr.findOne({ 'type.name': 'covid19' });
        const fieldsScores = {};
        fichaTemplate.sections.find(s => s.name === SECCION_ENFERMEDADES_PREVIAS)?.fields.forEach(f => {
            if (f.extras?.puntosScore) {
                fieldsScores[f.key] = f.extras.puntosScore;
            }
        });

        const comorbilidades = enfermedadesFields?.filter(f => !f.presenta);
        comorbilidades.forEach(f => {
            const valor = fieldsScores[Object.keys(f)[0]];
            score += valor ? valor : 0;
        });
    }
    return score;
}


function getScoreEdad(edad) {
    if (edad >= 50 && edad < 60) {
        return 1;
    } else if (edad >= 60 && edad < 70) {
        return 2;
    } else if (edad >= 70) {
        return 3;
    }

    return 0;
}

export async function getScoreValue(ficha) {
    const edadPaciente = calcularEdad(ficha.paciente.fechaNacimiento, ficha.createdAt);
    const scoreComorbilidades = await getScoreComorbilidades(ficha);
    const scoreEdad = getScoreEdad(edadPaciente);
    return scoreComorbilidades + scoreEdad;
}

export function getSeccionClasificacion(ficha) {
    return ficha.secciones.find(s => s.name === SECCION_CLASIFICACION);
}


export async function checkFichaAbierta(pacienteId, fecha) {
    const ficha = await FormsEpidemiologia.findOne({
        'paciente.id': pacienteId,
        $and: [
            { createdAt: { $gte: moment(fecha).subtract(14, 'days').toDate() } },
            { createdAt: { $lte: moment(fecha).add(14, 'days').toDate() } }
        ]
    });
    return ficha;
}

