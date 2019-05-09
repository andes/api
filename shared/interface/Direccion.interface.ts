import { IUbicacion } from './Ubicacion.interface';
import { Moment } from 'moment';
import { Document } from 'mongoose';

export interface IDireccion {
    tipo: String;
    valor: String;
    codigoPostal: String;
    ubicacion: IUbicacion;
    geoReferencia: Number[];
    ranking: Number;
    activo: Boolean;
    ultimaActualizacion: Date | Moment;
}

export interface IDireccionDoc extends Document, IDireccion { }
