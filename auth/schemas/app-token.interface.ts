import { Token } from './token.interface';

export interface AppToken extends Token {
    app: {
        nombre: string
    };
};
