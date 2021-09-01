import * as mongoose from 'mongoose';
import * as configPrivate from './../../../config.private';
import { Connections } from './../../../connections';

const sumarSchema = new mongoose.Schema({
    id_smiafiliados: Number,
    clavebeneficiario: String,
    afiapellido: String,
    afinombre: String,
    afitipodoc: String,
    aficlasedoc: String,
    afidni: String,
    afisexo: String,
    afidomdepartamento: String,
    afidomlocalidad: String,
    afitipocategoria: Number,
    afifechanac: Date,
    activo: String,
    cuieefectorasignado: String,
    cuielugaratencionhabitual: String,
    motivobaja: Number,
    mensajebaja: String,
    fechainscripcion: Date,
    fechacarga: Date,
    usuariocarga: String,
    embarazoactual: String
});

export const sumar: any = mongoose.model('sumar', sumarSchema, 'sumar');
