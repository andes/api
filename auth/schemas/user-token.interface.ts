import { Token } from './token.interface';
import * as mongoose from 'mongoose';

export interface UserToken extends Token {
    usuario: {
        id: mongoose.Types.ObjectId
        nombreCompleto: string,
        nombre: string,
        apellido: string,
        username: string,
        documento: string
    };
    // roles: string[];
    profesional: any;
}
