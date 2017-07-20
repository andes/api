import { Token } from './token.interface';

export interface PacienteToken extends Token {
    usuario: {
        id: string
        nombre: string,
        email: string,
    };
    pacientes: any[];
};