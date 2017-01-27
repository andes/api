import * as mongoose            from 'mongoose';
import * as codificadorSchema   from './codificador';
import * as moleculaSchema      from './molecula';

var tipoPrestacionSchema = new mongoose.Schema({
    // valor por el cual vamos a leer/guardar en nuestra BD
    key: String,
    nombre: String,
    descripcion: String,
    codigo: [codificadorSchema],
    autonoma: Boolean,
    solicitud: [tipoPrestacionSchema],
    ejecucion: [tipoPrestacionSchema],
    //reglasSolicitud: [reglaSchema] // TODO
    //reglasEjecucion: [reglaSchema] // TODO
    //reglasVisibilidad: [reglaSchema] // TODO
    // requiereEvolucionAdministrativa: Boolean,
    // requiereEvolucionCalidad: Boolean,
    activo: Boolean,
    componente: String
});

export = tipoPrestacionSchema;
