import * as mongoose from 'mongoose';

var matriculacionSchena = new mongoose.Schema({
    turno: { type: mongoose.Schema.Types.ObjectId, ref: 'turno' },
    aprobado: { type: Boolean, default: false },
    supervisor: { type: String, required: false }
});

//Virtuals


var matriculacion = mongoose.model('matriculacion', matriculacionSchena, 'matriculacion');

export = matriculacion;
