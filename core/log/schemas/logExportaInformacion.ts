import * as mongoose from 'mongoose';

export const informacionExportadaSchema = new mongoose.Schema({
    fecha: {
        type: Date
    },
    sistema: String,
    key: String,
    idPrestacion: mongoose.Schema.Types.ObjectId,
    idPaciente: mongoose.Schema.Types.ObjectId,
    info_enviada: { type: mongoose.Schema.Types.Mixed },
    resultado: { type: mongoose.Schema.Types.Mixed }
});

informacionExportadaSchema.index({ fecha: 1, sistema: 1, key: 1 });
informacionExportadaSchema.index({ fecha: 1, idPaciente: 1 });

export const InformacionExportada = mongoose.model('nomivacInformacionExportada', informacionExportadaSchema, 'nomivacInformacionExportada');
