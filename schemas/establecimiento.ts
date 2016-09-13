import * as mongoose from 'mongoose';

var establecimientoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    nivelComplejidad: {
        type:Number,
        requiered :true
    },

    tipoEstablecimiento : {
        nombre: String,
        descripcion: String,
        clasificacion: String
    },
    domicilio: {
        calle: String,
        numero: Number,
        localidad: {
                nombre: String,
                codigoPostal: String                
            },
        provincia:  String
    },
    codigo:{
        sisa: {
            type: Number,
            required: true
        },
        cuie: String,
        remediar: String
    },
    habilitado:{
        type: Boolean,
        required : true
    },
    fechaAlta: Date,
    fechaBaja: Date

});

var establecimiento = mongoose.model('establecimiento', establecimientoSchema, 'establecimiento');

export = establecimiento;
