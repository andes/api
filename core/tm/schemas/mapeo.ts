import * as mongoose from 'mongoose';

const mapeoShema = new mongoose.Schema({
    identificador: String,
    codigoOrigen: String,
    descripcionOrigen: String,
    codigoDestino: String,
    descripcionDestino: String
});
const mapeo = mongoose.model('mapeo', mapeoShema, 'mapeo');
export = mapeo;
