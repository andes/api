import * as mongoose from 'mongoose';


let prestacionesAFacturarSchema = new mongoose.Schema({
    id: Object,
    nombre: String,
    conceptId: String,
    activo: Boolean

});


export let prestacionesAFacturarModel = mongoose.model('prestacionesAFacturar',prestacionesAFacturarSchema,'prestacionesAFacturar')
