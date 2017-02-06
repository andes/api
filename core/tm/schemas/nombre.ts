import * as mongoose from 'mongoose';

var nombreSchema = new mongoose.Schema({  
    nombre: String
});
export = nombreSchema;