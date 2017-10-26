const constantes = {
    SEXO: {
        type: String,
        enum: ['femenino', 'masculino', 'otro']
    },
    EstadoAgendaSips: {
        activa: 1,
        inactiva: 3,
        cerrada: 4
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

    idUsuarioSips: '1486739'
};
export = constantes;
