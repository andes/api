import { AndesDoc } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import * as configPrivate from './../../../config.private';
import { Connections } from './../../../connections';

export interface IPuco {
    tipoDoc: string;
    dni: number;
    codigoOS: number;
    transmite: string;
    nombre: string;
    coberturaSocial?: string;
    version: Date;
    numeroAfiliado?: string;
}

export type IPucoDocument = AndesDoc<IPuco>;

const PucoSchema = new mongoose.Schema({
    tipoDoc: String,
    dni: Number,
    codigoOS: Number,
    transmite: String,
    nombre: String,
    version: Date,
    numeroAfiliado: String
});

PucoSchema.index({ dni: 1, version: 1 });
PucoSchema.index({ version: 1 });

// Atención necesario para correr los test. No es necesario copiar esto en otros modelos!!!.
export const Puco = process.env.NODE_ENV === 'test'
    ? mongoose.model<IPucoDocument>(configPrivate.puco.database, PucoSchema, configPrivate.puco.database)
    : Connections.puco.model<IPucoDocument>(configPrivate.puco.database, PucoSchema, configPrivate.puco.database);


