"use strict";
var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    type: String,
    enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro"]
});
module.exports = schema;
//# sourceMappingURL=estadoCivil.js.map