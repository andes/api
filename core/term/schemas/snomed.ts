import * as mongoose from 'mongoose';
import { Connections } from './../../../connections';
import * as configPrivate from './../../../config.private';

export let schema = new mongoose.Schema({
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: String,
    refsetIds: [String]
});

// Se asegura que los índices estén creados
schema.index({ words: 1, semanticTag: 1, language: 1, conceptActive: 1, active: 1 });
schema.index({ conceptId: 1, semanticTag: 1, language: 1, conceptActive: 1, active: 1 });
schema.index({ refsetIds: 1, semanticTag: 1, language: 1, conceptActive: 1, active: 1 });

export let model = Connections.snomed.model(configPrivate.snomed.dbName, schema, configPrivate.snomed.dbVersion);
