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
        liberado: 4,
        suspendido: 5
    },
    
    EstadoExportacionAgendaCache: {
        pendiente: 'pendiente',
        exportadaSIPS: 'exportada a Sips'
    },

    idUsuarioSips: '1486739'
};
export = constantes;