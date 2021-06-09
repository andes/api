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
        fechaNacimiento: Date,
    },
    secciones: [Object],
    zonaSanitaria: zonaSanitariasSchema,
    score: {
        value: String,
        fecha: Date
    }
});

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
        // Evento para crear un seguimiento a partir del caso confirmado
        EventCore.emitAsync('epidemiologia:seguimiento:create', ficha);
        // TODO: Evaluar que deberíamos hacer en caso que modifiquen la ficha de confirmado --> sospechoso por error (¿evento para quitar el seguimiento? o ¿que lo hagan a manopla?)
    }
    next();
});


export const FormsEpidemiologia = mongoose.model('formsEpidemiologia', FormsEpidemiologiaSchema, 'formsEpidemiologia');
