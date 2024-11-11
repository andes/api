import { EventCore } from '@andes/event-bus/';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { zonaSanitariasSchema } from '../../../core/tm/schemas/zonaSanitarias';
import { FormConfigSchema } from '../forms.schema';
import { SECCION_CLASIFICACION, SECCION_USUARIO } from './constantes';

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
    config: FormConfigSchema,
    zonaSanitaria: zonaSanitariasSchema,
    snvs: { type: Boolean, default: false },
    idCasoSnvs: { type: String, default: '' },
    active: {
        type: Boolean,
        required: true,
        default: true
    },
    configLaboratorio: new mongoose.Schema({
        interopera: Boolean,
        nroIdentificacion: { type: Number, unique: true },
        resultado: mongoose.Schema.Types.Mixed
    }, { _id: false })
});

const assertUniquePCR = async function (next) {
    const ficha: any = this;
    if (ficha.type.name === 'covid19') {
        const identificadorpcr = ficha.secciones.find(s => s.name === SECCION_CLASIFICACION)?.fields.find(f => f.identificadorpcr)?.identificadorpcr;
        if (identificadorpcr) {
            const found = await FormsEpidemiologia.findOne({ 'secciones.fields.identificadorpcr': identificadorpcr, _id: { $ne: ficha._id } });
            if (found) {
                return next('El identificador PCR ya fue registrado en el sistema');
            }
        }
    }

    return next();
};

const generarNumeroUnico = function (): number {
    const numeroUnico = Math.floor(1000000000 + Math.random() * 9000000000);
    return numeroUnico;
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

    const seccionClasificacion = ficha.secciones.find(s => s.name === SECCION_CLASIFICACION);
    const clasificacionfinal = seccionClasificacion?.fields.find(f => f.clasificacionfinal)?.clasificacionfinal;
    const muestraPcr = seccionClasificacion?.fields.find(f => f.pcrM)?.pcrM;
    const seccionUsuario = ficha.secciones.find(s => s.name === SECCION_USUARIO);
    if (clasificacionfinal === 'Confirmado') {
        const usuarioConfirma = seccionClasificacion?.fields.find(f => f.usuarioconfirma)?.usuarioconfirma;
        if (!usuarioConfirma) {
            const user = seccionUsuario.fields.find(f => f.responsable)?.responsable;
            seccionClasificacion.fields.push({ usuarioconfirma: user });
        }

        EventCore.emitAsync('epidemiologia:seguimiento:create', ficha);
    }
    if (muestraPcr) {
        const usuarioPcr = seccionClasificacion?.fields.find(f => f.usuarioconfirma)?.usuarioconfirma;
        if (!usuarioPcr) {
            const user = seccionUsuario.fields.find(f => f.responsable)?.responsable;
            seccionClasificacion.fields.push({ usuariopcr: user });
        }
    }
    if (ficha.configLaboratorio?.interopera) {
        const nroIdentificacion = generarNumeroUnico();
        ficha.configLaboratorio.nroIdentificacion = nroIdentificacion;
    }
    next();
});

FormsEpidemiologiaSchema.post('save', (ficha: any) => {
    const { FormsHistory } = require('./forms-history.schema');
    const history = new FormsHistory(ficha.toJSON());
    history._id = new mongoose.Types.ObjectId();
    if (ficha.config?.idEvento && !ficha.snvs) {
        EventCore.emitAsync('alta:fichaEpidemiologica:snvs', ficha);
    }
    history.save();
});


export const FormsEpidemiologia = mongoose.model('formsEpidemiologia', FormsEpidemiologiaSchema, 'formsEpidemiologia');
