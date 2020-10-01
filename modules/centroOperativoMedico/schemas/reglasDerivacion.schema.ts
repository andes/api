import * as mongoose from 'mongoose';
export const ESTADOS_DERIVACION = ['pendiente', 'aprobada', 'rechazada', 'asignada', 'denegada', 'aceptada', 'finalizada', 'aceptada por omision'];

export const ReglasDerivacionSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    estadoInicial: {
        type: String,
        enum: ESTADOS_DERIVACION
    },
    estadoFinal: {
        type: String,
        enum: ESTADOS_DERIVACION
    },
    soloCom: Boolean,
    modificaDestino: Boolean
});

export let ReglasDerivacion = mongoose.model('reglasDerivacion', ReglasDerivacionSchema, 'reglasDerivacion');
