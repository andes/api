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

    idOrganizacionHPN: '57e9670e52df311059bc8964',

    tiposPrestacionesHPN: {
        clinicaMedica: {
            id: 705,
            conceptId: '401000013105'
        },
        consultaPediatrica: {
            id: 901,
            conceptId: '511000013109'
        }
    }
};
export = constantes;
