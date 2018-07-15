import { paciente } from './../../mpi/schemas/paciente';
import * as mongoose from 'mongoose';
import * as organizacion from '../../../core/tm/schemas/organizacion';

export let schema = new mongoose.Schema({
    key: {
        type: String,
        required: function () {
            return !this.paciente;
        }
    },
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return !this.key;
        }
    },
    fecha: {
        type: Date,
        required: true,
    },
    operacion: {
        type: String,
        required: true
    },
    usuario: mongoose.Schema.Types.Mixed,       //  = Se copia idéntico desde el token
    app: mongoose.Schema.Types.Mixed,           //  = Se copia idéntico desde el token
    organizacion: mongoose.Schema.Types.Mixed,  //  = Se copia idéntico desde el token
    data: {
        anterior: mongoose.Schema.Types.Mixed,
        valor: mongoose.Schema.Types.Mixed,
    },
    cliente: {
        ip: String,
        userAgent: { // utiliza plugin https://github.com/biggora/express-useragent
            isMobile: Boolean,
            isDesktop: Boolean,
            isBot: Boolean,
            browser: String,
            version: String,
            os: String,
            platform: String,
            source: String
        }
    },
    servidor: {
        ip: String
    }
});

// Indices
schema.index({ key: 1, fecha: -1 });
schema.index({ paciente: 1, fecha: -1 });

export let model = mongoose.model('logV2', schema, 'logV2');
