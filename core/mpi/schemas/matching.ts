import * as mongoose from 'mongoose';
import * as ubicacionSchema from '../../tm/schemas/ubicacion';

let matchingSchema = new mongoose.Schema({
    pacienteOriginal: {
        idPaciente: Number,
        documento: String,
        estado: {
            type: String,
            required: true,
            enum: ['temporal', 'identificado', 'validado', 'recienNacido', 'extranjero']
        },
        nombre: String,
        apellido: String,
        contacto: [{
            tipo: {
                type: String,
                enum: ['Teléfono Fijo', 'Teléfono Celular', 'Email', '']
            },
            valor: String,
            ranking: Number, // Specify preferred order of use (1 = highest) // Podemos usar el rank para guardar un historico de puntos de contacto (le restamos valor si no es actual???)
            ultimaActualizacion: Date,
            activo: Boolean
        }],
        direccion: [{
            valor: String,
            codigoPostal: String,
            ubicacion: ubicacionSchema,
            ranking: Number,
            geoReferencia: {
                type: [Number], // [<longitude>, <latitude>]
                index: '2d' // create the geospatial index
            },
            ultimaActualizacion: Date,
            activo: Boolean
        }],
       sexo: {
            type: String,
            enum: ['femenino', 'masculino', 'otro', '']
        },
        genero: {
            type: String,
            enum: ['femenino', 'masculino', 'otro', '']
        }, // identidad autopercibida
        fechaNacimiento: Date, // Fecha Nacimiento
        estadoCivil: {
            type: String,
            enum: ['casado', 'separado', 'divorciado', 'viudo', 'soltero', 'otro', '']
        },
        claveSN: String
    },
    pacienteMutante: {
        idPaciente: Number,
        documento: String,
        estado: {
            type: String,
            required: true,
            enum: ['temporal', 'identificado', 'validado', 'recienNacido', 'extranjero']
        },
        nombre: String,
        apellido: String,
        contacto: [{
            tipo: {
                type: String,
                enum: ['Teléfono Fijo', 'Teléfono Celular', 'Email', '']
            },
            valor: String,
            ranking: Number, // Specify preferred order of use (1 = highest) // Podemos usar el rank para guardar un historico de puntos de contacto (le restamos valor si no es actual???)
            ultimaActualizacion: Date,
            activo: Boolean
        }],
        direccion: [{
            valor: String,
            codigoPostal: String,
            ubicacion: ubicacionSchema,
            ranking: Number,
            geoReferencia: {
                type: [Number], // [<longitude>, <latitude>]
                index: '2d' // create the geospatial index
            },
            ultimaActualizacion: Date,
            activo: Boolean
        }],
       sexo: {
            type: String,
            enum: ['femenino', 'masculino', 'otro', '']
        },
        genero: {
            type: String,
            enum: ['femenino', 'masculino', 'otro', '']
        }, // identidad autopercibida
        fechaNacimiento: Date, // Fecha Nacimiento
        estadoCivil: {
            type: String,
            enum: ['casado', 'separado', 'divorciado', 'viudo', 'soltero', 'otro', '']
        },
        claveSN: String
    },

    matchNumber: Number
});

let matching = mongoose.model('matching', matchingSchema, 'matching');

export = matching;
