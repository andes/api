import * as mongoose from 'mongoose';

var schema = new mongoose.Schema({
    type: String,
    enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro"]    
});

export = schema;
