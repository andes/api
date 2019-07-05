import * as mongoose from 'mongoose';

export let SnomedMappingSchema = new mongoose.Schema({
    conceptId: String,
    mapGroup: Number,
    mapPriority: Number,
    mapAdvice: String,
    mapTarget: String,
    mapRule: [mongoose.Schema.Types.Mixed]
});
SnomedMappingSchema.index({
    conceptId: 1,
    mapGroup: 1,
    mapPriority: 1
});
export let SnomedMapping = mongoose.model('snomed-cie10', SnomedMappingSchema, 'snomed-cie10');
