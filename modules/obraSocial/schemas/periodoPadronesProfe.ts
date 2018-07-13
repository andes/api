import * as mongoose from 'mongoose';

let periodoPadronesProfeSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    version: String  // YYYYMM
});

export let periodoPadronesProfe = mongoose.model('periodoPadronesProfe', periodoPadronesProfeSchema, 'periodoPadronesProfe');
