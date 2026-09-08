import { IContacto } from './IContacto';
import { IDireccion } from './IDireccion';

export interface IFarmacia {
    denominacion: string;
    razonSocial: string;
    cuit: string;
    DTResponsable: Date;
    matriculaDTResponsable: string;
    disposicionAltaDT: string;
    activo: boolean;
    farmaceuticosAuxiliares: [];
    horarios: [];
    domicilio: IDireccion;
    contactos: IContacto;
    asociadoA: string;
    disposicionHabilitacion: string;
    fechaHabilitacion: Date;
    fechaRenovacion: Date;
    vencimientoHabilitacion: Date;
    gabineteInyenctables: Boolean;
    laboratoriosMagistrales: Boolean;
    expedientePapel: string;
    expedienteGDE: string;
    nroCaja: string;
    tipoEstablecimiento: string;
    disposiciones: [{
        numero: string;
        descripcion: string;
    }];
    sancion: [{
        numero: string;
        descripcion: string;
    }];
}
