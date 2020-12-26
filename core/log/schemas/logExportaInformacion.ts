import * as mongoose from 'mongoose';

export let informacionExportadaSchema = new mongoose.Schema({
    fecha: {
        type: Date
    },
    sistema: String,
    key: String,
    idPaciente: mongoose.Schema.Types.ObjectId,
    info_enviada: { type: mongoose.Schema.Types.Mixed },
    resultado: { type: mongoose.Schema.Types.Mixed }
});

informacionExportadaSchema.index({ fecha: 1, sistema: 1, key: 1 });
informacionExportadaSchema.index({ fecha: 1, idPaciente: 1 });

export let InformacionExportada = mongoose.model('informacionExportada', informacionExportadaSchema, 'informacionExportada');
