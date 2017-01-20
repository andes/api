"use strict";
var mongoose = require('mongoose');
var provinciaSchema = require('./provincia');
var provincia = mongoose.model('provincia', provinciaSchema, 'provincia');
module.exports = provincia;
//# sourceMappingURL=provincia_model.js.map