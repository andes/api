import { Document } from 'mongoose';


export interface IFinanciador {
    codigoPuco: Number;
    nombre: String;
    financiador: String;
    numeroAfiliado: String;
    prepaga: Boolean;
    idObraSocial: Number;
    origen: 'PUCO' | 'SUMAR' | 'ANDES';
    fechaDeActualizacion: Date;
}

export interface IFinanciadorDoc extends Document, IFinanciador { }
