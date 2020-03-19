import { Schema, model, SchemaTypes, Document } from 'mongoose';
import * as edificioSchema from './edificio';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';
import { SnomedConcept, ISnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { tipoPrestacionSchema, ITipoPrestacion } from './tipoPrestacion';
import { IDireccion } from '../interfaces/IDireccion';
import { IContacto } from '../interfaces/IContacto';

export interface ISectores {
    tipoSector: ISnomedConcept;
    unidadConcept?: ISnomedConcept;
    nombre: String;
    hijos?: ISectores[];
}

export interface ITipoEstablecimiento {
    nombre: String;
    descripcion: String;
    clasificacion: String;
    idTipoEfector: Number;
}

export interface IOrganizacion extends Document {
    id: string;
    codigo: {
        sisa: String,
        cuie: String,
        remediar: String,
        servSalud: String,
    };
    nombre: String;
    tipoEstablecimiento: ITipoEstablecimiento;
    // direccion
    direccion: IDireccion;
    // contacto
    contacto: [IContacto];
    edificio: [{
        id: String,
        descripcion: String,
        contacto: IContacto,
        direccion: IDireccion,
    }];
    nivelComplejidad: Number;
    activo: Boolean;
    fechaAlta: Date;
    fechaBaja: Date;
    servicios: [ISnomedConcept];
    mapaSectores: ISectores[];
    unidadesOrganizativas: [ISnomedConcept];
    /**
     * "prestaciones" traidas de sisa. Se muestran en la app mobile
     * @type {[{ idSisa: number, nombre: string }]}
     * @memberof IOrganizacion
     */
    ofertaPrestacional?: [{ _id: string, prestacion: ITipoPrestacion, detalle: string }];
    /**
     * Indica si debe mostrarse en los mapas. Por defecto se muestra en los hospitales, centro de salud, punto sanitario
     * @type {boolean}
     * @memberof IOrganizacion
     */
    showMapa?: boolean;
}

export let MapaSectoresSchema = new Schema({
    tipoSector: SnomedConcept,
    unidadConcept: {
        type: SnomedConcept,
        required: false
    },
    nombre: String
});
MapaSectoresSchema.add({ hijos: [MapaSectoresSchema] });

let CodigoSchema = new Schema({
    sisa: {
        type: String,
        required: true
    },
    cuie: String,
    remediar: String,
    sips: String,
    servSalud: String,
});

const _schema = new Schema({
    codigo: {
        type: CodigoSchema
    },
    nombre: String,
    tipoEstablecimiento: {
        type: tipoEstablecimientoSchema
    },
    contacto: [contactoSchema],
    direccion: {
        type: direccionSchema
    },
    edificio: [edificioSchema],
    nivelComplejidad: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    turnosMobile: {
        type: Boolean,
        default: false
    },
    fechaAlta: Date,
    fechaBaja: Date,
    showMapa: Boolean,
    mapaSectores: [MapaSectoresSchema],
    unidadesOrganizativas: [SnomedConcept],
    configuraciones: SchemaTypes.Mixed,
    ofertaPrestacional: [{ prestacion: tipoPrestacionSchema, detalle: String }] // "prestaciones" traidas de sisa. Se muestran en la app mobile
});

_schema.plugin(AuditPlugin);

export const OrganizacionSchema = _schema;
export const Organizacion = model<IOrganizacion>('organizacion', _schema, 'organizacion');
