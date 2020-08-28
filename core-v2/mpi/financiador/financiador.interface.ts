import { Document } from 'mongoose';

export interface IFinanciador {
    codigoPuco: Number;
    nombre: String;
    financiador: String;
    numeroAfiliado: String;
    prepaga: Boolean;
    idObraSocial: Number;
}

export interface IFinanciadorDoc extends Document, IFinanciador { }
