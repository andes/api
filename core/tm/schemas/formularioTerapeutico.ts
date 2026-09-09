import { model, Schema } from 'mongoose';


export const formularioTerapeuticoSchema = new Schema({
    ftpSistema: {
        _id: { type: Schema.Types.ObjectId },
        nombre: String
    },
    ftpFuncion: {
        _id: { type: Schema.Types.ObjectId },
        nombre: String
    },
    ftpGrupoFarmacologico: {
        _id: { type: Schema.Types.ObjectId },
        nombre: String
    },
    nivelComplejidad: String,
    especialidad: String,
    requisitos: String,
    carroEmergencia: String,
    medicamento: String,
    indicaciones: String,
    recomendacionesDeUso: String,
    principioActivo: String,
    via: String,
    formaFarmaceutica: String,
    potencia: String,
    unidades: String,
    presentacion: String,
    atcVia: String,
    snomed: String
});

export const FormularioTerapeutico = model('formulario-terapeutico', formularioTerapeuticoSchema, 'formulario-terapeutico');

