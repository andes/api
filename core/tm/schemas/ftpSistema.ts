import * as mongoose from 'mongoose';

const ftpSistemaSchema = new mongoose.Schema({
    nombre: String
});

export const FtpSistema = mongoose.model('ftpSistema', ftpSistemaSchema, 'ftpSistema');
