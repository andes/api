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
    version: Date;
}

export type IPucoDocument = AndesDoc<IPuco>;

const PucoSchema = new mongoose.Schema({
    tipoDoc: String,
    dni: Number,
    codigoOS: Number,
    transmite: String,
    nombre: String,
    version: Date
});

PucoSchema.index({ dni: 1, version: 1 });
PucoSchema.index({ version: 1 });
export const Puco = Connections.puco.model<IPucoDocument>(configPrivate.puco.database, PucoSchema, configPrivate.puco.database);

