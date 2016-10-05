import * as mongoose from 'mongoose';

var lugarSchema = new mongoose.Schema({  
    id: mongoose.Schema.Types.ObjectId,
    nombre: String
});
export = lugarSchema;