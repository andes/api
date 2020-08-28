import { INombre } from './Nombre.interface';

export interface IUbicacion {
    barrio?: INombre;
    localidad: INombre;
    provincia: INombre;
    pais: INombre;
}
