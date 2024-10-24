import * as mongoose from 'mongoose';
import * as direccionSchema from '../../../core/tm/schemas/direccion';
import * as contactoSchema from '../../../core/tm/schemas/contacto';


const farmaciaAuxiliarSchema = new mongoose.Schema({
    farmaceutico: String,
    matricula: Number,
    disposicionAlta: String,
});

const farmaciaSchema = new mongoose.Schema({
    denominacion: String,
    razonSocial: String,
    cuit: String,
    DTResponsable: String,
    matriculaDTResponsable: Number,
    disposicionAltaDT: String,
    farmaceuticaAuxiliar: [farmaciaAuxiliarSchema],
    horarios: [String],
    domicilio: { type: direccionSchema },
    contactos: [contactoSchema],
    asociadoA: {
        type: String,
        enum: ['Colegio de Farmacéuticos', 'Farmacias Sociales', 'Camara de Farmacéuticos', 'Independientes']
    },
    disposicionHabilitacion: String,
    fechaHabilitacion: Date,
    fechaRenovacion: Date,
    vencimientoHabilitacion: Date,
    gabineteInyenctables: Boolean,
    laboratoriosMagistrales: Boolean,
    expedientePapel: String,
    expedienteGDE: String,
    nroCaja: String,
    disposiciones: [{
        numero: String,
        descripcion: String
    }],
    sancion: [{
        numero: String,
        descripcion: String
    }]
});

const farmacia = mongoose.model('farmacias', farmaciaSchema, 'farmacias');

export = farmacia;
