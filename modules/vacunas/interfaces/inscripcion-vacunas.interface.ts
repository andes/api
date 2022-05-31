
import * as moment from 'moment';
import { Schema, Types } from 'mongoose';
import { INombre } from '../../../shared/interfaces';

export interface IInscripcionVacunas {
    id: string | Types.ObjectId;
    fechaRegistro: Date | moment.Moment;
    nroTramite: String;
    documento: String;
    nombre: String;
    apellido: String;
    fechaNacimiento: Date;
    sexo: String;
    grupo: {
        id: Schema.Types.ObjectId;
        nombre: String;
    };
    email: String;
    telefono: String;
    localidad: INombre;
    estado: String;
    validado: Boolean;
    personal_salud?: Boolean;
    validaciones: String[];
    paciente: {
        id: Types.ObjectId;
        nombre: String;
        alias?: String;
        apellido: String;
        documento: String;
        numeroIdentificacion?: String;
        sexo: String;
        genero: String;
        fechaNacimiento: Date;
        telefono: String;
        addAt: Date;
    };
    nota?: String;
    cud?: String;
    alergia?: Boolean;
    condicion?: Boolean;
    enfermedad?: Boolean;
    convaleciente?: Boolean;
    aislamiento?: Boolean;
    vacuna?: Boolean;
    plasma?: Boolean;
    profesion?: String;
    matricula?: String;
    establecimiento?: String;
    localidadEstablecimiento?: INombre;
    relacion?: String;
    diaseleccionados?: String;
    fechaVacunacion?: Date;
    idPrestacionVacuna?: Types.ObjectId;
    morbilidades?: String[];
    fechaValidacion?: Date;
    localidadDeclarada?: String;
    fechaCertificado?: Date;
    idPrestacionCertificado?: Types.ObjectId;
    llamados?: Types.ObjectId[];
    numeroIdentificacion?: String;
    fechaProximoLlamado?: Date;
    asignado?: {
        fechaAsignacion: Date;
        usuario: {
            id: Types.ObjectId;
            nombreCompleto: String;
            nombre: String;
            apellido: String;
            username: String;
            documento: String;
        };
    };
    turno?: {
        organizacion: {
            id: Types.ObjectId;
            nombre: String;
        };
        fechaYHora: Date;
    };
}
