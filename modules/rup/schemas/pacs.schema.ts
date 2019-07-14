import * as mongoose from 'mongoose';

export let PacsSchema = new mongoose.Schema({
    organizacion: {
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String
    },
    host: String,
    port: Number,
    /**
     adt04: String,
     adt08: String,
     oru01: String,
     */
    messages: mongoose.SchemaTypes.Mixed,
    mapping: [{
        expression: String,
        orm04: Object  //
    }]

});


export let PacsConfig = mongoose.model('pacs_config', PacsSchema, 'pacs_config');
