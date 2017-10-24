import { Token } from './token.interface';

export interface PacienteToken extends Token {
    usuario: {
        nombre: string,
        email: string,
    };
    pacientes: any[];
}
