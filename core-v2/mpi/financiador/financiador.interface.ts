import { Schema, Document } from 'mongoose';

export interface IFinanciador {
    codigoPuco: Number;
    nombre: String;
    financiador: String;
    // id: Schema.Types.ObjectId;
    numeroAfiliado: String;
    prepaga: Boolean;
    idObraSocial: Number;
}
