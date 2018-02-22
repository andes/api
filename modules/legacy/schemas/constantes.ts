const constantes = {
    SEXO: {
        type: String,
        enum: ['femenino', 'masculino', 'otro']
    },

    EstadoAgendaAndes: {
        publicada: 'publicada',
        suspendida: 'suspendida'
    },

    EstadoAgendaSips: {
        activa: 1,
        inactiva: 3,
        cerrada: 4
    },

    EstadoTurnosAndes: {
        asignado: 'asignado'
    },

    EstadoTurnosSips: {
        activo: 1,
        disponible: 1,
        liberado: 4,
        suspendido: 5
    },

    MotivoTurnoBloqueo: {
        turnoDoble: 1,
        retiroDelProfesional: 2,
        otros: 3,
        reserva: 4
    },

    EstadoExportacionAgendaCache: {
        pendiente: 'pendiente',
        exportadaSIPS: 'exportada a Sips',
        codificada: 'codificada'
    },

    Especialidades: {
        odontologia: 34,
        medicinaGral: 14
    },
    idUsuarioSips: '1486739',
    idOrganizacionHPN: '57e9670e52df311059bc8964', // Lo tenemos para simplificar la búsqueda en el efector HPN
    prestacionesIntegradasPorEfector: [
        {
            organizacion: '57e9670e52df311059bc8964',
            prestaciones: [{
                nombre: 'clinicaMedica',
                id: 705,
                conceptId: '268565007'
            },
            {
                nombre: 'Medicina General',
                id: 705,
                conceptId: '391000013108'
            },
            {
                nombre: 'examenPediatrico',
                id: 901,
                conceptId: '243788004'
            }]
        },
        {
            organizacion: '57fcf037326e73143fb48c3a',
            prestaciones: [{
                nombre: 'Odontología',
                id: 34,
                conceptId: '34043003'
            },
            {
                nombre: 'Odontopediatría',
                id: 34,
                conceptId: '481000013101'
            }]
        }
    ]
};
export = constantes;

