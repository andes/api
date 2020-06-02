import { IContactoEnum } from './Constantes.interface';
import * as moment from 'moment';
import { Document } from 'mongoose';

export interface IContacto {
    tipo: IContactoEnum;
    valor: String;
    ranking: number;
    ultimaActualizacion: Date | moment.Moment;
    activo: Boolean;
}

export interface IContactoDoc extends Document, IContacto { }
