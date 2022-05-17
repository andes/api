import * as mongoose from 'mongoose';

export const QueriesMappingSchema = new mongoose.Schema({
    sourceKey: String,
    sourceValue: String,
    targetKey: String,
    targetValue: String
});

export const QueriesMapping = mongoose.model('queries-mapping', QueriesMappingSchema, 'queries_mapping');
