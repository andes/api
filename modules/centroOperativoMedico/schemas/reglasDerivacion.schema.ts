import * as mongoose from 'mongoose';
export const ESTADOS_DERIVACION = ['solicitada', 'habilitada', 'inhabilitada', 'asignada', 'rechazada', 'aceptada', 'finalizada', 'encomendada'];

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
    modificaDestino: Boolean,
    defineGravedad: Boolean
});

export const ReglasDerivacion = mongoose.model('reglasDerivacion', ReglasDerivacionSchema, 'reglasDerivacion');
