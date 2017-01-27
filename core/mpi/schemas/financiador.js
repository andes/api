"use strict";
var mongoose = require('mongoose');
var financiadorSchema = new mongoose.Schema({
    entidad: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    codigo: String,
    activo: Boolean,
    fechaAlta: Date,
    fechaBaja: Date,
    ranking: Number,
});
//# sourceMappingURL=financiador.js.map