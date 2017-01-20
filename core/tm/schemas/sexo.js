"use strict";
var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    type: String,
    enum: ["femenino", "masculino", "otro"],
});
module.exports = schema;
//# sourceMappingURL=sexo.js.map