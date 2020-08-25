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

export interface IDireccionDoc extends Document, IDireccion {
    /**
     * Determina si todos los campos de la dirección están cargados
     */
    isCompleted(): Boolean;

    /**
     * Devuelve la dirección formateada (calle, localidad, provincia)
     */
    format(): String;
}
