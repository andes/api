import { Document } from 'mongoose';

export interface IParentesco {
    nombre: String;
    opuesto: String;
}

export interface IParentescoDoc extends Document, IParentesco { }
