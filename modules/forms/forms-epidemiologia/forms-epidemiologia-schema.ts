import { EventCore } from '@andes/event-bus/';
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

FormsEpidemiologiaSchema.pre('save', function (next) {
    const ficha: any = this;

    const seccionClasificacion = ficha.secciones.find(s => s.name === 'Tipo de confirmación y Clasificación Final');
    const clasificacionfinal = seccionClasificacion?.fields.find(f => f.clasificacionfinal)?.clasificacionfinal;
    const muestraPcr = seccionClasificacion?.fields.find(f => f.pcrM)?.pcrM;
    const seccionUsuario = ficha.secciones.find(s => s.name === 'Usuario');
    if (clasificacionfinal === 'Confirmado') {
        const usuarioConfirma = seccionClasificacion?.fields.find(f => f.usuarioconfirma)?.usuarioconfirma;
        if (!usuarioConfirma) {
            const user = seccionUsuario.fields.find(f => f.responsable)?.responsable;
            seccionClasificacion.fields.push({ usuarioconfirma: user });
        }
        const edadPaciente = calcularEdad(ficha.paciente.fechaNacimiento, ficha.createdAt);
        const comorbilidades = ficha.secciones.find(s => s.name === 'Enfermedades Previas')?.fields.find(f => f.presenta)?.presenta;
        ficha.score = {
            value: edadPaciente >= 60 && comorbilidades ? 10 : comorbilidades ? 6 : 3,
            fecha: new Date()
        };
        EventCore.emitAsync('epidemiologia:seguimiento:create', ficha);
    }
    if (muestraPcr) {
        const usuarioPcr = seccionClasificacion?.fields.find(f => f.usuarioconfirma)?.usuarioconfirma;
        if (!usuarioPcr) {
            const user = seccionUsuario.fields.find(f => f.responsable)?.responsable;
            seccionClasificacion.fields.push({ usuariopcr: user });
        }
    }
    next();
});

FormsEpidemiologiaSchema.post('save', (ficha: any) => {
    const { FormsHistory } = require('./forms-history.schema');
    const history = new FormsHistory(ficha.toJSON());
    history._id = new mongoose.Types.ObjectId();

    history.save();
});


export const FormsEpidemiologia = mongoose.model('formsEpidemiologia', FormsEpidemiologiaSchema, 'formsEpidemiologia');
