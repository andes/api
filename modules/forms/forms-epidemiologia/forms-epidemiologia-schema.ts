import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { calcularEdad } from '../../../core-v2/mpi/paciente/paciente.schema';
import * as mongoose from 'mongoose';
import { zonaSanitariasSchema } from '../../../core/tm/schemas/zonaSanitarias';

const ObjectId = mongoose.Types.ObjectId;

export const FormsEpidemiologiaSchema = new mongoose.Schema({
    type: {
        id: ObjectId,
        name: String
    },
    paciente: new mongoose.Schema({
        id: { type: ObjectId, ref: 'paciente' },
        documento: String,
        nombre: String,
        apellido: String,
        sexo: String,
        genero: String,
        estado: String,
        alias: String,
        tipoIdentificacion: String,
        numeroIdentificacion: String,
        direccion: Object,
        fechaNacimiento: Date
    }, { _id: false }),
    secciones: [mongoose.Schema.Types.Mixed],
    zonaSanitaria: zonaSanitariasSchema,
    score: {
        value: String,
        fecha: Date
    }
});

const assertUniquePCR = async function (next) {
    const ficha: any = this;
    if (ficha.type.name === 'covid19') {
        const identificadorpcr = ficha.secciones.find(s => s.name === 'Tipo de confirmación y Clasificación Final')?.fields.find(f => f.identificadorpcr)?.identificadorpcr;
        if (identificadorpcr) {
            const found = await FormsEpidemiologia.findOne({ 'secciones.fields.identificadorpcr': identificadorpcr, _id: { $ne: ficha._id } });
            if (found) {
                return next('El identificador PCR ya fue registrado en el sistema');
            }
        }
    }

    return next();
};
FormsEpidemiologiaSchema.index({
    createdAt: -1
});

FormsEpidemiologiaSchema.index({
    'secciones.fields.identificadorpcr': 1
}, { sparse: true });

export const FormsEpidemiologiaCloneSchema = FormsEpidemiologiaSchema.clone();

FormsEpidemiologiaSchema.plugin(AuditPlugin);

FormsEpidemiologiaSchema.pre('validate', assertUniquePCR);

export const FormsEpidemiologia = mongoose.model('formsEpidemiologia', FormsEpidemiologiaSchema, 'formsEpidemiologia');
