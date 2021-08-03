import { EventCore } from '@andes/event-bus/';
import * as mongoose from 'mongoose';
import { FormsEpidemiologia } from '../forms-epidemiologia-schema';
import { Prestacion } from '../../../../modules/rup/schemas/prestacion';
import { Auth } from '../../../../auth/auth.class';
import { SnomedCtr } from '../../../../core/term/controller/snomed.controller';
import { calcularEdad } from '../../../../core-v2/mpi/paciente/paciente.schema';
import * as moment from 'moment';
import { SeguimientoPaciente } from '../../../../modules/seguimiento-paciente/schemas/seguimiento-paciente.schema';

const confirmadoNexoCid = '711000246101';
const confirmadoTestRapidoCid = '901000246101';
const descartadoTestRapidoCid = '891000246100';
const confirmadoPCRCid = '840539006';
const consultaSeguimientoCid = '5891000013104';
export const seccionClasificacionName = 'Tipo de confirmación y Clasificación Final';

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
    EventCore.emitAsync('notificacion:epidemio:lamp', { lamps });
}

async function getRegistrosEjecucionCasoConfirmado(ficha) {
    const conceptIds = [];
    const seccion = getSeccionClasificacion(ficha);
    const segundaclasificacion = seccion?.fields.find(f => f.segundaclasificacion)?.segundaclasificacion;

    if (segundaclasificacion.id === 'confirmado') {
        conceptIds.push(confirmadoNexoCid);
    } else {
        if (segundaclasificacion.id === 'antigeno') {
            const antigeno = seccion?.fields.find(f => f.antigeno)?.antigeno;
            if (antigeno.id === 'confirmado') {
                conceptIds.push(confirmadoTestRapidoCid);
            } else if (antigeno.id === 'muestra') {
                conceptIds.push(descartadoTestRapidoCid);
            }
        }
        conceptIds.push(confirmadoPCRCid);
    }

    return await SnomedCtr.getConcepts(conceptIds);
}

export function getSeccionClasificacion(ficha) {
    return ficha.secciones.find(s => s.name === seccionClasificacionName);
}

export async function crearPrestacionClasificacionFicha(ficha) {
    const consultaSeguimientoConcept = await SnomedCtr.getConcept(consultaSeguimientoCid, '');
    const conceptosEjecucion = await getRegistrosEjecucionCasoConfirmado(ficha);

    const registros = conceptosEjecucion.map((c: any) => ({
        concepto: c,
        elementoRUP: '594aa21a884431c25d9a0266',
        nombre: c.term,
        esSolicitud: false
    }));

    const nuevaPrestacion = {
        inicio: 'fuera-agenda',
        paciente: ficha.paciente,
        solicitud: {
            fecha: ficha.updatedAt || ficha.createdAt,
            tipoPrestacion: consultaSeguimientoConcept,
            organizacion: (ficha.updatedBy || ficha.createdBy).organizacion,
            profesional: {},
            ambitoOrigen: 'ambulatorio',
            registros: []
        },
        ejecucion: {
            fecha: ficha.updatedAt || ficha.createdAt,
            registros
        },
        estados: [{
            fecha: new Date(),
            tipo: 'validada'
        }],
    };
    const user = Auth.getUserFromResource(ficha);
    const prestacion = new Prestacion(nuevaPrestacion);
    Auth.audit(prestacion, user as any);
    await prestacion.save();
}

export function calcularScore(ficha) {
    const comorbilidades = ficha.secciones.find(s => s.name === 'Enfermedades Previas')?.fields.find(f => f.presenta)?.presenta;
    const edadPaciente = calcularEdad(ficha.paciente.fechaNacimiento, ficha.createdAt);
    return {
        value: edadPaciente >= 60 && comorbilidades ? 10 : comorbilidades ? 6 : 3,
        fecha: new Date()
    };
}

export function moreThan14Days(seguimiento) {
    return moment().diff(seguimiento.fechaInicio, 'days') >= 14 ? true : false;
}

export async function emitCasoConfirmado(ficha, esProfesional) {
    const seccionClasificacion = getSeccionClasificacion(ficha);
    const clasificacionfinal = seccionClasificacion?.fields.find(f => f.clasificacionfinal)?.clasificacionfinal;
    const seguimientos: any = await SeguimientoPaciente.find({ 'paciente.id': ficha.paciente.id }, null, { sort: { createdAt: 1 } });
    const seguimiento = seguimientos[0];
    const seguimientoEnCurso = seguimiento && !moreThan14Days(seguimiento) && (seguimiento.ultimoEstado.clave === 'pendiente' || seguimiento.ultimoEstado.clave === 'seguimiento');

    if (clasificacionfinal === 'Confirmado' && !seguimientoEnCurso) {
        if (esProfesional) {
            // await crearPrestacionClasificacionFicha(ficha);
        }
        EventCore.emitAsync('epidemiologia:seguimiento:create', ficha);
    }
}
