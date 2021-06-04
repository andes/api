import { IOrganizacion } from '../../../core/tm/interfaces/IOrganizacion';

export interface IRecuperoPDF {
    fechaActual: string;
    efector: IOrganizacion;
    efectorCodigoSisa: any;
    nombre: string;
    dni: string | number;
    sexo: string;
    edad: string | number;
    horaInicio: string;
    tipoPrestacion: string;
    obraSocial: string;
    codigoOs: string | number;
}
