import * as mongoose from 'mongoose';

let ultimaCarpetaSchema = new mongoose.Schema({
    idEfector: String,
    ultimaCarpeta: Number

});

let ultimaCarpeta = mongoose.model('ultimaCarpeta', ultimaCarpetaSchema, 'ultimaCarpeta');
export = ultimaCarpeta;
