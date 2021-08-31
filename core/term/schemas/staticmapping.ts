import * as mongoose from 'mongoose';

export const schema = new mongoose.Schema({
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

export const model = mongoose.model('snomed-cie10-static', schema, 'snomed-cie10-static');
