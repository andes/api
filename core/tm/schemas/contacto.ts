import * as mongoose from 'mongoose';
import * as ubicacionSchema from './ubicacion';

var schema = new mongoose.Schema({    
    tipo: {
        type: String,
        enum: ["fijo", "celular", "email"]
    },
    valor: String,
    ranking: Number, // Specify preferred order of use (1 = highest) // Podemos usar el rank para guardar un historico de puntos de contacto (le restamos valor si no es actual???)

    // Revisar mongoose created_at / modified_in
    ultimaActualizacion: Date,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },    
});



export = schema;
