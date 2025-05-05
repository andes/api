import { Document } from 'mongoose';

export interface IParentesco {
    nombre: String;
    opuesto: String;
    esConviviente: Boolean;
}

export interface IParentescoDoc extends Document, IParentesco { }
