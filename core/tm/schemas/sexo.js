"use strict";
var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    sexo: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""]
    }
}, { strict: false });
module.exports = schema;
//# sourceMappingURL=sexo.js.map