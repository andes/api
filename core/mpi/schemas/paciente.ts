import * as mongoose from 'mongoose';
import * as mongoosastic from 'mongoosastic';
import * as ubicacionSchema from '../../tm/schemas/ubicacion';
import * as direccionSchema from '../../tm/schemas/direccion';
import * as contactoSchema from '../../tm/schemas/contacto';
import * as config from '../../../config';

var pacienteSchema = new mongoose.Schema({
    identificadores: [{
        entidad: String,
        valor: String
    }],
    documento: {
        type: String,
        es_indexed: true
    },
    activo: Boolean,
    estado: {
        type: String,
        required: true,
        enum: ["temporal", "validado", "recienNacido", "extranjero"],
        es_indexed: true
    },
    nombre: {
        type: String,
        es_indexed: true
    },
    apellido: {
        type: String,
        es_indexed: true
    },
    alias: String,
    contacto: [contactoSchema],
    direccion: [direccionSchema],
    sexo: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""],
        es_indexed: true
    },
    genero: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""]
    }, // identidad autopercibida
    fechaNacimiento: {
        type: Date,
        es_indexed: true
    }, // Fecha Nacimiento
    fechaFallecimiento: Date,
    estadoCivil: {
        type: String,
        enum: ["casado", "separado", "divorciado", "viudo", "soltero", "concubino", "otro", ""]
    },
    foto: String,
    Nacionalidad: String,
    relaciones: [{
        relacion: {
            type: String,
            enum: ["padre", "madre", "hijo", "hermano", "tutor", ""]
        },
        referencia: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'paciente'
        },
        nombre: String,
        apellido: String,
        documento: String
    }],
    financiador: [{ //obrasocial, plan sumar 
        entidad: {
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        },
        codigo: String,
        activo: Boolean,
        fechaAlta: Date,
        fechaBaja: Date,
        ranking: Number,
    }],
    claveBlocking: [String],
    entidadesValidadoras: [String]
});

//Defino Virtuals
pacienteSchema.virtual('nombreCompleto').get(function () {
    return this.nombre + ' ' + this.apellido;
});

//Creo un indice para fulltext Search
pacienteSchema.index({
    '$**': 'text'
});

//conectamos con elasticSearch
pacienteSchema.plugin(mongoosastic, {
    hosts: [config.connectionStrings.elastic_main],
    index: 'andes',
    type: 'paciente'
});

var paciente = mongoose.model('paciente', pacienteSchema, 'paciente');

/**
 * mongoosastic create mappings
 */
/*
paciente.createMapping(function (err, mapping) {
    if (err) {
        console.log('error creating mapping (you can safely ignore this)');
        console.log(err);
    } else {
        console.log('mapping created!');
        console.log(mapping);
    }
});
*/

/**
 * mongoosastic synchronize
 */
/*var stream = paciente.synchronize(function (err) {
        console.log(err);
    }),
    count = 0;
stream.on('data', function (err, doc) {
    count++;
});
stream.on('close', function () {
    console.log('indexed ' + count + ' documents from LeadSearch!');
});
stream.on('error', function (err) {
    console.log(err);
});
*/
export = paciente;