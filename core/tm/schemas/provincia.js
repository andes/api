"use strict";
var mongoose = require('mongoose');
var paisSchema = require('./pais');
var provinciaSchema = new mongoose.Schema({
    nombre: String,
    pais: paisSchema
});
module.exports = provinciaSchema;
//# sourceMappingURL=provincia.js.map