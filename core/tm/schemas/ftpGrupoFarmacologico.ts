import * as mongoose from 'mongoose';

const ftpGrupoFarmacologicoSchema = new mongoose.Schema({
    nombre: String
});

export const FtpGrupoFarmacologico = mongoose.model('ftpGrupoFarmacologico', ftpGrupoFarmacologicoSchema, 'ftpGrupoFarmacologico');

