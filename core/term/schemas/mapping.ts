import * as mongoose from 'mongoose';

export let SnomedMappingSchema = new mongoose.Schema({
    conceptId: String,
    mapGroup: Number,
    mapPriority: Number,
    mapAdvice: String,
    mapTarget: String,
    mapRule: [mongoose.Schema.Types.Mixed]
});

export let SnomedMapping = mongoose.model('snomed-cie10', SnomedMappingSchema, 'snomed-cie10');
