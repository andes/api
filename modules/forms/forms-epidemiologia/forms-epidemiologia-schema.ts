import { EventCore } from '@andes/event-bus/';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { zonaSanitariasSchema } from '../../../core/tm/schemas/zonaSanitarias';

export const FormsEpidemiologiaSchema = new mongoose.Schema({
    type: {
        id: mongoose.Schema.Types.ObjectId,
        name: String
    },
    paciente: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'paciente' },
        documento: String,
        nombre: String,
        apellido: String,
        sexo: String,
        estado: String,
        tipoIdentificacion: String,
        numeroIdentificacion: String,
        direccion: Object,
        fechaNacimiento: Date,
    },
    secciones: [Object],
    zonaSanitaria: zonaSanitariasSchema,
    score: {
        value: String,
        fecha: Date
    }
});

export const FormsEpidemiologiaCloneSchema = FormsEpidemiologiaSchema.clone();

FormsEpidemiologiaSchema.plugin(AuditPlugin);

FormsEpidemiologiaSchema.pre('save', function (next) {
    let ficha: any = this;
    const calcularEdad = (fecha) => {
        let edad = null;
        if (fecha) {
            const birthDate = new Date(fecha);
            const currentDate = new Date();
            let years = (currentDate.getFullYear() - birthDate.getFullYear());
            if (currentDate.getMonth() < birthDate.getMonth() ||
                currentDate.getMonth() === birthDate.getMonth() && currentDate.getDate() < birthDate.getDate()) {
                years--;
            }
            edad = years;
        }
        return edad;
    };

    const seccionClasificacion = ficha.secciones.find(s => s.name === 'Tipo de confirmación y Clasificación Final');
    let clasificacionfinal = seccionClasificacion.fields.find(f => f.clasificacionfinal)?.clasificacionfinal;
    const edadPaciente = calcularEdad(ficha.paciente.fechaNacimiento);
    const comorbilidades = ficha.secciones.find(s => s.name === 'Enfermedades Previas')?.fields.find(f => f.presenta)?.presenta;

    if (clasificacionfinal === 'Confirmado') {
        ficha.score = {
            value: edadPaciente >= 60 && comorbilidades ? 10 : comorbilidades ? 6 : 3,
            fecha: new Date()
        };
        EventCore.emitAsync('epidemiologia:seguimiento:create', ficha);
    }
    next();
});


export const FormsEpidemiologia = mongoose.model('formsEpidemiologia', FormsEpidemiologiaSchema, 'formsEpidemiologia');
