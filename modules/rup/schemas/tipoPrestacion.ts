import * as mongoose            from 'mongoose';
import * as codificadorSchema   from './codificador';

var tipoPrestacionSchema = new mongoose.Schema({
    // valor por el cual vamos a leer/guardar en nuestra BD
    key: String,
    nombre: String,
    descripcion: String,
    codigo: [codificadorSchema],
    autonoma: Boolean,
    solicitud: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tipoPrestacion'
    }],
    ejecucion: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tipoPrestacion'
    }],
    //reglasSolicitud: [reglaSchema] // TODO
    //reglasEjecucion: [reglaSchema] // TODO
    //reglasVisibilidad: [reglaSchema] // TODO
    // requiereEvolucionAdministrativa: Boolean,
    // requiereEvolucionCalidad: Boolean,
    activo: Boolean,
    componente: String
});

var tipoPrestacion = mongoose.model('tipoPrestacion', tipoPrestacionSchema, 'tipoPrestacion');

export = tipoPrestacion;
