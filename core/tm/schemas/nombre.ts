import * as mongoose from 'mongoose';

var nombreSchema = new mongoose.Schema({  
    nombre: {
        type: String,
        required: true
    }
});

export = nombreSchema;
