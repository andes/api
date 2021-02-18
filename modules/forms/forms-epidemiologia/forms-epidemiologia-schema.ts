import * as mongoose from 'mongoose';

export const FormsEpidemiologiaSchema = new mongoose.Schema({
    type: String,
    createdAt: Date,
    updatedAt: Date,
    paciente: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'paciente' },
        documento: String,
        nombre: String,
        apellido: String,
        fechaNacimiento: Date,
    },
    secciones: [Object]
});


export const FormsEpidemiologia = mongoose.model('formsEpidemiologia', FormsEpidemiologiaSchema, 'formsEpidemiologia');
