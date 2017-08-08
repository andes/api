import * as mongoose from 'mongoose';
import { Connections } from './../../../connections';
import * as configPrivate from './../../../config.private';

export let snomedSchema = new mongoose.Schema({
    conceptId: String,
    term: String,
    active: Boolean,
    conceptActive: Boolean,
    fsn: String,
    module: String,
    definitionStatus: String
});

export let snomedModel = Connections.snomed.model(configPrivate.snomed.dbName, snomedSchema, configPrivate.snomed.dbVersion);