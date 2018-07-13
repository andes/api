import * as mongoose from 'mongoose';

let periodoPadronesProfeSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    version: Date
});

export let periodoPadronesProfe = mongoose.model('periodoPadronesProfe', periodoPadronesProfeSchema, 'periodoPadronesProfe');
