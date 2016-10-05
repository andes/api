"use strict";
var mongoose = require('mongoose');
var lugarSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String
});
module.exports = lugarSchema;
//# sourceMappingURL=lugar.js.map