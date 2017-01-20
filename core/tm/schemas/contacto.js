"use strict";
var mongoose = require("mongoose");
var schema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ["fijo", "celular", "email"]
    },
    valor: String,
    ranking: Number,
    // Revisar mongoose created_at / modified_in
    ultimaActualizacion: Date,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
});
module.exports = schema;
//# sourceMappingURL=contacto.js.map