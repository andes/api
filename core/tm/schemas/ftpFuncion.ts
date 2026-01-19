import * as mongoose from 'mongoose';

const ftpFuncionSchema = new mongoose.Schema({
    nombre: String
});

export const FtpFuncion = mongoose.model('ftpFuncion', ftpFuncionSchema, 'ftpFuncion');

