import { Token } from './token.interface';

export interface UserToken extends Token {
    usuario: {
        id: string;
        nombreCompleto: string;
        nombre: string;
        apellido: string;
        username: string;
        documento: string;
    };
    // roles: string[];
    profesional: any;
}
