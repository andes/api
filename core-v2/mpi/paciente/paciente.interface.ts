import * as moment from 'moment';
import { Document, Schema, Types } from 'mongoose';
import { IContacto, IContactoDoc, IDireccion, IDireccionDoc } from '../../../shared/interfaces';
import { IFinanciador } from '../financiador/financiador.interface';
import { IParentesco } from '../parentesco/parentesco.interface';

export interface ICarpetaEfector {
    organizacion: any;
    nroCarpeta: String;
}

export interface INota {
    fecha: Date | moment.Moment;
    nota: String;
    destacada: Boolean;
}

export interface IIdentificador {
    entidad: String;
    valor: String;
}

export interface IRelacion {
    relacion: IParentesco;
    referencia: Schema.Types.ObjectId;
    financiador: String;
    nombre: String;
    apellido: String;
    documento: String;
    foto: String;
    fotoId?: Schema.Types.ObjectId;
    fechaNacimiento?: Date | moment.Moment;
    numeroIdentificacion?: String;
    fechaFallecimiento?: Date | moment.Moment;
    activo?: Boolean;
}

export interface IPaciente {
    nombre: String;
    apellido: String;
    fechaNacimiento: Date | moment.Moment;
    sexo: String;
    genero: String;
    estado: String;
    documento?: String;
    identificadores?: IIdentificador[];
    certificadoRenaper?: String;
    cuil?: String;
    activo?: Boolean;
    alias?: String;
    fechaFallecimiento?: Date | moment.Moment;
    estadoCivil?: String;
    foto?: String;
    fotoId?: Schema.Types.ObjectId;
    fotoMobile?: String;
    nacionalidad?: String;
    tipoIdentificacion?: String;
    numeroIdentificacion?: String;
    claveBlocking?: String[];
    entidadesValidadoras?: String[];
    reportarError?: Boolean;
    notaError?: String;
    carpetaEfectores?: ICarpetaEfector[];
    notas?: INota[];
    financiador?: IFinanciador[];
    relaciones?: IRelacion[];
    contacto?: IContacto[];
    direccion?: IDireccion[];
    scan?: String;
    idPacientePrincipal?: Schema.Types.ObjectId;
}

export interface IPacienteDoc extends Document, IPaciente {
    contacto?: Types.DocumentArray<IContactoDoc>;
    direccion?: Types.DocumentArray<IDireccionDoc>;
    nombre: string;
    apellido: string;
    tokens?: string[];
    fotoId?: Schema.Types.ObjectId;
    createdAt: Date;
    createdBy: any;
    updatedBy?: any;
    updatedAt?: Date;
    scan?: String;
    /**
     * Devuelve los campos originales antes de haber sufrido alguna modificacion.
     */
    original(): Object;
}
