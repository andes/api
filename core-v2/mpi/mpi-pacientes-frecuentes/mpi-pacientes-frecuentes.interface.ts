import { Schema } from 'mongoose';

export interface IMpiPacienteFrecuente {
    usuario: Schema.Types.ObjectId;
    paciente: Schema.Types.ObjectId;
    ultimoAcceso: Date;
    cantidad: Number;
}
