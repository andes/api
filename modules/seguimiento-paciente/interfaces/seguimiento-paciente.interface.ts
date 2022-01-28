import { Types } from 'mongoose';

export interface ISeguimientoPaciente {
    id?: Types.ObjectId | string;
    fechaInicio: Date;
    origen: {
        id: string;
        nombre: string;
        tipo: string;
    };
    score: {
        value: number;
        fecha: Date;
    };
    paciente: {
        id: string;
        nombre: string;
        apellido: string;
        documento: string;
        telefonoActual: string;
        direccionActual: string;
        sexo: string;
        foto: string;
        fechaNacimiento: Date;
    };
    llamados: any[];
    organizacionSeguimiento: {
        id: string;
        nombre: string;
        codigoSisa: string;
    };
    asignaciones?: [
        {
            profesional: {
                id: string;
                nombre: string;
                apellido: string;
                documento: string;
            };
            fecha: Date;
        }
    ];
    ultimaAsignacion?: {
        profesional: {
            id: string;
            nombre: string;
            apellido: string;
            documento: string;
        };
        fecha: Date;
    };
    ultimoEstado: {
        clave: string;
        valor: Date;
    };
    contactosEstrechos: any[];
    internacion?: boolean;
}
