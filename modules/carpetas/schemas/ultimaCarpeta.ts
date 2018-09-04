import * as mongoose from 'mongoose';

const ultimaCarpetaSchema = new mongoose.Schema({
    idEfector: String,
    ultimaCarpeta: Number

});

const ultimaCarpeta = mongoose.model('ultimaCarpeta', ultimaCarpetaSchema, 'ultimaCarpeta');
export = ultimaCarpeta;
