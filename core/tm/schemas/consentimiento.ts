import { Model, model, Schema } from 'mongoose';

export const consentimientoVersionSchema = new Schema({
    programa: { type: String, required: true },
    version: { type: Number, required: true },
    titulo: { type: String, required: true },
    texto: { type: String, required: true },
    activo: { type: Boolean, required: true },
    formato: { type: String, required: true, enum: ['html', 'markdown', 'text'] },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.Mixed }
});

export const consentimientoSchema = new Schema({
    programa: { type: String, required: true },
    version: { type: Number, required: true },
    pacienteId: { type: Schema.Types.ObjectId, ref: 'paciente' },
    aceptacion: { type: Boolean, required: true },
    fechaResp: { type: Date, default: Date.now },
    log: [{
        aceptacion: { type: Boolean },
        fechaResp: { type: Date, default: Date.now }
    }]
});

export const padronElectoralSchema = new Schema({
    matricula: { type: Number, required: true },
    tipo_matricula: { type: String, required: true },
    nombre: { type: String },
    apellido: { type: String, required: true },
    domicilio: { type: String },
    circuito: { type: Number, required: true },
    nombre_circuito: { type: String, required: true },
    genero: { type: String, required: true },
    mesa: { type: Number, required: true },
    orden: { type: Number, required: true },
    escuela: { type: String, required: true },
    dir_escuela: { type: String, required: true }
});

export const ConsentimientoVersion = model('consentimientoVersion', consentimientoVersionSchema, 'consentimientoVersion');
export const Consentimiento = model('consentimiento', consentimientoSchema, 'consentimiento');
export const PadronElectoral = model('padronElectoral', padronElectoralSchema, 'padronElectoral');
