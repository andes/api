import { model, Schema } from 'mongoose';

export const consentVersionSchema = new Schema({
    programa: { type: String, required: true },
    version: { type: Number, required: true },
    titulo: { type: String, required: true },
    texto: { type: String, required: true },
    activo: { type: Boolean, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.Mixed }
});

export const consentimientoSchema = new Schema({
    programa: { type: String, required: true },
    version: { type: Number, required: true },
    pacienteId: { type: Schema.Types.ObjectId, ref: 'paciente' },
    aceptacion: { type: Boolean, required: true },
    fechaResp: { type: Date, default: Date.now }
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

export const ConsentVersion = model('consentVersion', consentVersionSchema, 'consentVersion');
export const Consentimiento = model('consentimiento', consentimientoSchema, 'consentimiento');
export const PadronElectoral = model('padronElectoral', padronElectoralSchema, 'padronElectoral');
