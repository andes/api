import * as mongoose from 'mongoose';
import * as mongoosastic from 'mongoosastic';
import * as direccionSchema from '../../tm/schemas/direccion';
import * as contactoSchema from '../../tm/schemas/contacto';
import * as financiadorSchema from './financiador';
import * as constantes from './constantes';
import * as config from '../../../config';
import * as moment from 'moment';
import { connectMpi} from '../../../connectMpi';

export let pacienteSchema = new mongoose.Schema({
    identificadores: [{
        _id: false,
        entidad: String,
        valor: String
    }],
    documento: {
        type: String,
        es_indexed: true
    },
    activo: Boolean,
    estado: constantes.ESTADO,
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
    sexo: constantes.SEXO,
    genero: constantes.SEXO,
    fechaNacimiento: {
        type: Date,
        es_indexed: true
    },
    fechaFallecimiento: Date,
    estadoCivil: constantes.ESTADOCIVIL,
    foto: String,
    nacionalidad: String,
    relaciones: [{
        relacion: constantes.PARENTEZCO,
        referencia: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'paciente'
        },
        nombre: String,
        apellido: String,
        documento: String
    }],
    financiador: [financiadorSchema],
    claveBlocking: {type: [String] , es_indexed: true},
    entidadesValidadoras: [String]
});

/* Se definen los campos virtuals */
pacienteSchema.virtual('nombreCompleto').get(function () {
    return this.nombre + ' ' + this.apellido;
});
pacienteSchema.virtual('edad').get(function () {
    let edad = null;
    if (this.fechaNacimiento) {
        let birthDate = new Date(this.fechaNacimiento);
        let currentDate = new Date();
        let years = (currentDate.getFullYear() - birthDate.getFullYear());
        if (currentDate.getMonth() < birthDate.getMonth() ||
            currentDate.getMonth() === birthDate.getMonth() && currentDate.getDate() < birthDate.getDate()) {
            years--;
        }
        edad = years;
    }
    return edad;
});
pacienteSchema.virtual('edadReal').get(function () {

                let edad: Object;
                let fechaNac: any;
                let fechaActual: Date = new Date();
                let fechaAct: any;
                let difAnios: any;
                let difDias: any;
                let difMeses: any;
                let difHs: any;
                let difD: any;

                fechaNac = moment(this.fechaNacimiento, 'YYYY-MM-DD HH:mm:ss');
                fechaAct = moment(fechaActual, 'YYYY-MM-DD HH:mm:ss');
                difDias  = fechaAct.diff(fechaNac, 'd'); // Diferencia en días
                difAnios = Math.trunc(difDias / 365.25);
                difMeses = Math.trunc(difDias / 30.4375);
                difHs    = fechaAct.diff(fechaNac, 'h'); // Diferencia en horas

                if (difAnios !== 0)  {edad = { valor: difAnios, unidad: 'Años'}}
                else
                    if (difMeses !== 0)  {edad = { valor: difMeses, unidad: 'Mes'}}
                    else
                        if (difDias !== 0 ) {edad = { valor: difDias, unidad: 'Dias'}}
                        else
                            if (difHs !== 0) {edad = { valor: difHs, unidad: 'Horas'}}

                return edad

});
/* Creo un indice para fulltext Search */
pacienteSchema.index({
    '$**': 'text'
});
/*conectamos con elasticSearch*/
pacienteSchema.plugin(mongoosastic, {
    hosts: [config.connectionStrings.elastic_main],
    index: 'andes',
    type: 'paciente'
} );

// Habilitar plugin de auditoría
pacienteSchema.plugin(require('../../../mongoose/audit'));


export let paciente = mongoose.model('paciente', pacienteSchema, 'paciente');
export let pacienteMpi = connectMpi.model('paciente', pacienteSchema, 'paciente');

