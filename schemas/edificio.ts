import * as mongoose from 'mongoose';
import * as ubicacionSchema from './ubicacion';
mongoose.set('debug', true);

var edificioSchema = new mongoose.Schema({
    descripcion: String,
    telefono: {
        tipo: {
            type: String,
            enum: ["","Teléfono Fijo", "Teléfono Celular", "email"]
        },
        valor: String,
        ranking: Number, // Specify preferred order of use (1 = highest) // Podemos usar el rank para guardar un historico de puntos de contacto (le restamos valor si no es actual???)
        ultimaActualizacion: Date,
        activo: Boolean
    },
    direccion: {
        valor: String,
        codigoPostal: String,
        ubicacion: ubicacionSchema,
        ranking: Number,
        geoReferencia: {
            type: [Number],
            index: '2d'
        },
        ultimaActualizacion: Date,
        activo: Boolean
    }
});

export = edificioSchema;