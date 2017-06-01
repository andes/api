import * as mongoose from 'mongoose';

export let snomedSchema = new mongoose.Schema({
  
});

export let snomed = mongoose.model('snomed', snomedSchema, 'v20160430');
