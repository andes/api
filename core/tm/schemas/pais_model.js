"use strict";
var mongoose = require('mongoose');
var paisSchema = require('./pais');
var pais = mongoose.model('pais', paisSchema, 'pais');
module.exports = pais;
//# sourceMappingURL=pais_model.js.map