import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    conceptId: {
        type: String,
        required: true,
        unique: true, // Unique index
    },
    mapTarget: {
        type: String,
        required: true
    }
});

schema.index({ conceptId: 1 });

export let model = mongoose.model('snomed-cie10-static', schema, 'snomed-cie10-static');
