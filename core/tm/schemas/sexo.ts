import { defaultLimit } from './../../../config';
import * as mongoose from 'mongoose';

var schema = new mongoose.Schema({
    sexo:{
        type: String,
        enum: ["femenino", "masculino", "otro",""]
    }
    
    // No se puede indexar esta propiedad cuando se incluye los subesquemas. Evaluar alternativa
    // es_indexed: true
},
{strict: false}
);

export = schema;
