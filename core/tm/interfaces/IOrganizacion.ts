import { Types } from 'mongoose';
import { ISnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { ITipoPrestacion } from '../schemas/tipoPrestacion';
import { IContacto } from './IContacto';
import { IDireccion } from './IDireccion';
import { ISectores } from './ISectores';
import { ITipoEstablecimiento } from './ITipoEstablecimiento';

export interface IOrganizacion {
    id: string | Types.ObjectId;
    codigo: {
        sisa: String;
        cuie: String;
        remediar: String;
        servSalud: String;
    };
    nombre: string;
    tipoEstablecimiento: ITipoEstablecimiento;
    // direccion
    direccion: IDireccion;
    // contacto
    contacto: [IContacto];
    edificio: [{
        id: String;
        descripcion: String;
        contacto: IContacto;
        direccion: IDireccion;
    }];
    nivelComplejidad: Number;
    activo: Boolean;
    fechaAlta: Date;
    fechaBaja: Date;
    servicios: [ISnomedConcept];
    mapaSectores: ISectores[];
    unidadesOrganizativas: ISnomedConcept[];
    /**
     * "prestaciones" traidas de sisa. Se muestran en la app mobile
     * @type {[{ idSisa: number, nombre: string }]}
     * @memberof IOrganizacion
     */
    ofertaPrestacional?: [{ _id: string; prestacion: ITipoPrestacion; detalle: string }];
    /**
     * Indica si debe mostrarse en los mapas. Por defecto se muestra en los hospitales, centro de salud, punto sanitario
     * @type {boolean}
     * @memberof IOrganizacion
     */
    showMapa?: boolean;
    configuraciones?: {
        emails: [{
            email: string;
            nombre: string;
        }];
    };
    esCOM: Boolean;
}

export type OrganizacionRef = Pick<IOrganizacion, 'id' | 'nombre'>;

export type UnidadOrganizativa = ISnomedConcept;
