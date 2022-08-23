import { INombre } from './nombre.interface';

export interface IUbicacion {
    barrio?: INombre;
    localidad: INombre;
    provincia: INombre;
    pais: INombre;
}

