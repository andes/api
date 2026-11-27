import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { SnomedConceptRaw } from '../../rup/schemas/snomed-concept';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const MapaAgendaProfesionalSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: false
    },
    apellido: {
        type: String,
        required: false
    }
});

export const MapaAgendaColoresSchema = new mongoose.Schema({
    concepto: {
        type: SnomedConceptRaw,
        required: true
    },
    color: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (value: string) => Boolean(value) && HEX_COLOR_REGEX.test(value),
            message: 'color debe ser un hexadecimal #RGB o #RRGGBB'
        }
    },
    alcance: {
        type: String,
        required: true,
        enum: ['global', 'organizacion', 'profesional']
    },
    organizacion: {
        type: nombreSchema,
        required(this: { alcance?: string }) {
            return this.alcance === 'organizacion' || this.alcance === 'profesional';
        }
    },
    profesional: {
        type: MapaAgendaProfesionalSchema,
        required(this: { alcance?: string }) {
            return this.alcance === 'profesional';
        }
    },
    activo: {
        type: Boolean,
        default: true
    }
});

/**
 * Normaliza ámbito para el índice único compuesto sobre
 * concepto.conceptId, alcance, organizacion._id, profesional._id.
 * Campos de ámbito ausentes deben persistirse como null (no omitidos)
 * para que MongoDB trate las claves de forma consistente entre alcances.
 */
MapaAgendaColoresSchema.pre('save', function (next) {
    const _doc: any = this;
    if (_doc.alcance === 'global') {
        _doc.organizacion = null;
        _doc.profesional = null;
    } else if (_doc.alcance === 'organizacion') {
        _doc.profesional = null;
    }
    next();
});

MapaAgendaColoresSchema.plugin(AuditPlugin);

MapaAgendaColoresSchema.index({
    'concepto.conceptId': 1,
    alcance: 1,
    'organizacion._id': 1,
    'profesional._id': 1
}, { unique: true });

MapaAgendaColoresSchema.index({ alcance: 1, 'organizacion._id': 1 });
MapaAgendaColoresSchema.index({ 'concepto.conceptId': 1 });
MapaAgendaColoresSchema.index({ activo: 1 });

export const MapaAgendaColores = mongoose.model(
    'mapa-agenda-colores',
    MapaAgendaColoresSchema,
    'mapa-agenda-colores'
);
