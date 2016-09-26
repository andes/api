import * as mongoose from 'mongoose';

var ubicacionSchema = new mongoose.Schema({  
       barrio: {
           id: mongoose.Schema.Types.ObjectId,
           nombre: String
       },
       localidad: {
           id: mongoose.Schema.Types.ObjectId,
           nombre: String
       },
       provincia: {
           id: mongoose.Schema.Types.ObjectId,
           nombre: String
       },
        pais: {
           id: mongoose.Schema.Types.ObjectId,
           nombre: String
       }
});

export = ubicacionSchema;