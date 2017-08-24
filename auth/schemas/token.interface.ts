import * as mongoose from 'mongoose';

export interface Token {
    id: mongoose.Types.ObjectId;
    organizacion: any; // schemas/organizacion
    permisos: string[];
    account_id: string;
    type: string;
}
