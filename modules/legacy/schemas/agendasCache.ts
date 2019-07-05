import * as mongoose from 'mongoose';

export let agendasCacheSchema = new mongoose.Schema({
    id: Object,
    organizacion: Object,
    profesionales: Object,
    tipoPrestaciones: Object,
    espacioFisico: Object,
    bloques: Object,
    estado: String,
    horaInicio: Date,
    horaFin: Date,
    createdAt: Date,
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.Mixed,
    estadoIntegracion: String,
    sobreturnos: Object,
});
agendasCacheSchema.index({ id: 1 });
export let agendasCache = mongoose.model('agendasCache', agendasCacheSchema, 'agendasCache');
