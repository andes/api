import * as mongoose from 'mongoose';

const paisSchema = new mongoose.Schema({
    nombre: String
});
export = paisSchema;
