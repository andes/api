import * as mongoose from 'mongoose';

var paisSchema = new mongoose.Schema({
    nombre: String
});

export = paisSchema;