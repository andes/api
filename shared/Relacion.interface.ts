import { Document } from 'mongoose';

export interface IRelacion {
    relacion: {
        id: string,
        nombre: string,
        opuesto: string
    };
    referencia: string;
    nombre: string;
    apellido: string;
    documento: string;
    fechaNacimiento?: Date;
    sexo?: string;
    foto?: string;
}

export interface IRelacionDoc extends Document, IRelacion { }
