import * as mongoose from 'mongoose';
import { snomedDB } from '../../../snomed';

export let snomedSchema = new mongoose.Schema({
    conceptId: String,
    term: String,
    active: Boolean,
    conceptActive: Boolean,
    fsn: String,
    module: String,
    definitionStatus: String
});

export let snomedModel = snomedDB.model('snomed', snomedSchema, 'v20160430');