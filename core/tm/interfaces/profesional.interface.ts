import { Mixed } from 'mongoose';

export interface IProfesional {
    nombre: string;
    apellido: string;
    documento: string;
    fechaNacimiento: Date;
    sexo: string;
    genero: string;
    formacionGrado?: any[];
    formacionPosgrado?: any[];
}
