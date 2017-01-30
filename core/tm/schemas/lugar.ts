import * as mongoose from 'mongoose';

var lugarSchema = new mongoose.Schema({  
    nombre: String
});
export = lugarSchema;