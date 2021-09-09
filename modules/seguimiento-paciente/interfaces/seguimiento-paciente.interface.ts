export interface ISeguimientoPaciente {
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
        location: object;
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
                _id: string;
                nombre: string;
                apellido: string;
                documento: string;
            };
            fecha: Date;
        }
    ];
    ultimaAsignacion?: {
        profesional: {
            _id: string;
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
}
