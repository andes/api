import * as mongoose from 'mongoose';
import { Connections } from './../../../connections';

export let snomedSchema = new mongoose.Schema({
    conceptId: String,
    term: String,
    active: Boolean,
    conceptActive: Boolean,
    fsn: String,
    module: String,
    definitionStatus: String
});

export let snomedModel = Connections.snomed.model('snomed', snomedSchema, 'v20160430tx');