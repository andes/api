import { Document } from 'mongoose';


export interface IFinanciador {
    codigoPuco: number;
    nombre: string;
    financiador: string;
    numeroAfiliado: string;
    prepaga: boolean;
    idObraSocial: number;
    origen: 'PUCO' | 'SUMAR' | 'ANDES';
    fechaDeActualizacion: Date;
}

export interface IFinanciadorDoc extends Document, IFinanciador { }
