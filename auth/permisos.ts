export default [
    {
        key: 'turnos',
        title: 'Modulo Citas',
        comment: '',
        child: [
            {
                key: 'editarEspacio',
                title: 'Editar espacios físicos',
                type: 'boolean'
            },
            {
                key: 'crearAgendas',
                title: 'Crear Agendas',
                type: 'boolean'
            },
            {
                key: 'clonarAgenda',
                title: 'Clonar Agendas',
                type: 'boolean'
            },
            {
                key: 'reasignarTurnos',
                title: 'Reasignar Turnos',
                type: 'boolean'
            },
            {
                key: 'planificarAgenda',
                title: 'Planificacion de agenda',
                child: [
                    { key: 'prestacion', title: 'Tipo de prestacion', type: 'prestacion' }
                ]
            },
            {
                key: 'agenda',
                title: 'Operaciones sobre agendas',
                child: [
                    { key: 'puedeEditar', title: 'Editar agenda', type: 'boolean' },
                    { key: 'puedeSuspender', title: 'Suspender', type: 'boolean' },
                    { key: 'puedeHabilitar', title: 'Habilitar agenda', type: 'boolean' },
                    { key: 'puedePublicar', title: 'Publicar agenda', type: 'boolean' },
                    { key: 'puedePausar', title: 'Pausar agenda', type: 'boolean' },
                    { key: 'puedeReanudar', title: 'Reanudar agenda', type: 'boolean' },
                    { key: 'puedeClonar', title: 'Clonar agenda', type: 'boolean' },
                    { key: 'puedeDarSobreturno', title: 'Dar Sobreturno agenda', type: 'boolean' },
                    { key: 'puedeImprimir', title: 'Revisar-Imprimir agenda', type: 'boolean' },
                    { key: 'puedeReasignar', title: 'Reasignar Turno', type: 'boolean' },
                    { key: 'puedeEditarCarpeta', title: 'Editar número de carpeta', type: 'boolean' },
                    { key: 'puedeBorrar', title: 'Borrar agenda', type: 'boolean' },
                ]
            },
            {
                key: 'turnos',
                title: 'Operaciones sobre turnos',
                child: [
                    { key: 'registrarAsistencia', title: 'Registrar Asistencia', type: 'boolean' },
                    { key: 'suspenderTurno', title: 'Suspender Turno', type: 'boolean' },
                    { key: 'liberarTurno', title: 'Liberar Turno', type: 'boolean' },
                    { key: 'editarCarpeta', title: 'Editar Carpeta', type: 'boolean' },
                    { key: 'turnoDoble', title: 'Marcar/Desmarcar Turno Doble', type: 'boolean' },
                ]
            },
            {
                key: 'darTurnos',
                title: 'Dar Turnos',
                child: [
                    { key: 'prestacion', title: 'Tipo de prestacion', type: 'prestacion' },
                    { key: 'delDia', title: 'Turnos del día', type: 'boolean' },
                    { key: 'paraProfesional', title: 'Para profesional', type: 'boolean' },
                    { key: 'programados', title: 'Turnos programados', type: 'boolean' }
                ]
            },
            {
                key: 'puntoInicio',
                title: 'puntoInicio',
                child: [
                    { key: 'solicitud', title: 'Registrar solicitud', type: 'boolean' },
                    { key: 'autocitado', title: 'Registrar Autocitación', type: 'boolean' },
                    { key: 'darTurnos', title: 'Dar turnos desde punto inicio', type: 'boolean' },
                    { key: 'puedeEditarCarpeta', title: 'Editar número de carpeta', type: 'boolean' }
                ]
            }
        ]
    },
    {
        key: 'mpi',
        title: 'Modulo MPI',
        comment: '',
        child: [
            { key: 'nuevoPaciente', title: 'Crear paciente', type: 'boolean' },
            { key: 'editarPaciente', title: 'Editar paciente', type: 'boolean' },
            {
                key: 'bloque',
                title: 'Bloques de pacientes similares',
                child: [
                    {
                        key: 'get',
                        title: 'Ver pacientes similares',
                        type: 'boolean'
                    }
                ]
            },
            {
                key: 'matching',
                title: 'Matching de pacientes',
                child: [
                    { key: 'get', title: 'Obtener porcentajes de matcheo (GET)', type: 'boolean' },
                    { key: 'patch', title: 'Modificar paciente (PATCH)', type: 'boolean' },
                    { key: 'put', title: 'Modificar paciente (PUT)', type: 'boolean' }
                ]
            },
            {
                key: 'paciente',
                title: 'ABM de pacientes',
                child: [
                    { key: 'dashboard', title: 'Dashboard', type: 'boolean' },
                    { key: 'getbyId', title: 'Detalle de un paciente', type: 'boolean' },
                    { key: 'elasticSearch', title: 'Busqueda de un paciente', type: 'boolean' },
                    { key: 'putMpi', title: 'Actualización de un paciente MPI', type: 'boolean' },
                    { key: 'deleteMpi', title: 'Eliminar un paciente MPI', type: 'boolean' },
                    { key: 'postAndes', title: 'Creacion de un paciente', type: 'boolean' },
                    { key: 'putAndes', title: 'Actualización de un paciente', type: 'boolean' },
                    { key: 'deleteAndes', title: 'Eliminar un paciente', type: 'boolean' },
                    { key: 'patchAndes', title: 'Modificar datos de un paciente', type: 'boolean' }, // patchAdams
                    { key: 'parentesco', title: 'Obtener parentesco', type: 'boolean' }
                ]

            },

        ]
    },
    {
        key: 'rup',
        title: 'Modulo RUP',
        comment: '',
        avoidAll: true,
        child: [
            { key: 'tipoPrestacion', title: 'Tipo de prestación', type: 'prestacion', avoidAll: true }
        ]
    },
    {
        key: 'internacion',
        title: 'Modulo Internación',
        comment: '',
        child: [
            {
                key: 'cama',
                title: 'Acciones sobre una cama',
                child: [
                    { key: 'create', title: 'Crear nueva cama', type: 'boolean' },
                    { key: 'baja', title: 'Eliminar cama', type: 'boolean' }
                ]
            },
            { key: 'censo', title: 'Ver senso diario y mensual', type: 'boolean' },
            { key: 'alta', title: 'Ingregar paciente', type: 'boolean' },
            { key: 'inicio', title: 'Punto de inicio', type: 'boolean' }
        ]

    },
    {
        key: 'huds',
        title: 'Modulo HUDS',
        comment: '',
        avoidAll: true,
        child: [
            { key: 'visualizacionHuds', title: 'Visualización HUDS por paciente', type: 'boolean' },
        ]
    },
    {
        key: 'fa',
        title: 'Fuentas Autenticas',
        comment: 'Habilita el acceso a distintas fuentes autenticas',
        child: [
            {
                key: 'get',
                title: 'Consulta a fuentes auntentica',
                child: [
                    { key: 'anses', title: 'ANSES', type: 'boolean' },
                    { key: 'sintys', title: 'SINTYS', type: 'boolean' },
                    { key: 'sisa', title: 'SISA', type: 'boolean' },
                    { key: 'renaper', title: 'RENAPER', type: 'boolean' }
                ]
            }
        ]
    },
    {
        key: 'log',
        title: 'Logueo',
        comment: '',
        child: [
            { key: 'post', title: 'Escritura', type: 'boolean' },
            { key: 'get', title: 'Lectura', type: 'boolean' }

        ]
    },
    {
        key: 'usuarios',
        title: 'Gestor de usuarios',
        child: [
            { key: 'set', title: 'Modificacion de permisos', type: 'boolean' },
            { key: 'get', title: 'Ver usuario', type: 'boolean' },
            { key: 'ldap', title: 'Consutar usuario en LDAP', type: 'boolean' },
            { key: 'post', title: 'Crear usuario', type: 'boolean' },
            { key: 'put', title: 'Modificar usuario', type: 'boolean' },
            { key: 'agregarEfector', title: 'Agregar efector', type: 'boolean' }
        ]
    },
    {
        key: 'matriculaciones',
        title: 'Matriculaciones',
        comment: '',
        child: [
            {
                key: 'profesionales',
                title: 'Gestor de profesionales',
                child: [
                    { key: 'getProfesional', title: 'Ver profesional', type: 'boolean' },
                    { key: 'getProfesionalFoto', title: 'Ver foto profesional', type: 'boolean' },
                    { key: 'postProfesional', title: 'crea profesional', type: 'boolean' },
                    { key: 'putProfesional', title: 'actualiza profesional', type: 'boolean' },
                    { key: 'deleteProfesional', title: 'borrar profesional', type: 'boolean' }
                ]
            },
            {
                key: 'turnos',
                title: 'Gestor de turnos',
                child: [
                    { key: 'postTurno', title: 'insert turno', type: 'boolean' },
                    { key: 'postTurnoTipo', title: '', type: 'boolean' },
                    { key: 'getTurnosProximos', title: 'trae proximos turnos', type: 'boolean' },
                    { key: 'getTurnoTipo', title: '', type: 'boolean' },
                    { key: 'getTurno', title: 'traeTurno', type: 'boolean' }
                ]
            },
            {
                key: 'agenda',
                title: 'Agenda',
                child: [
                    { key: 'postAgenda', title: 'insert agenda', type: 'boolean' },
                    { key: 'putAgenda', title: 'actualizar agenda', type: 'boolean' }
                ]
            }
        ]
    },
    {
        key: 'tm',
        title: 'Tablas maestras',
        child: [
            {
                key: 'especialidad',
                title: 'Especialidades',
                child: [
                    { key: 'postEspecialidad', title: 'insertar especialidad', type: 'boolean' },
                    { key: 'putEspecialidad', title: 'actualizar especialidad', type: 'boolean' },
                    { key: 'deleteEspecialidad', title: 'borrar especialidad', type: 'boolean' }
                ]
            },
            {
                key: 'organizacion',
                title: 'Organizaciones',
                child: [
                    { key: 'create', title: 'Crear nueva', type: 'boolean' },
                    { key: 'edit', title: 'Editar organizaciones', type: 'boolean' },
                    { key: 'delete', title: 'Borrar organizaciones', type: 'boolean' },
                    { key: 'sectores', title: 'Editar sectores físicos', type: 'organizacion' }
                ]
            },
        ]
    },
    {
        key: 'cda',
        title: 'Modulo CDA',
        child: [
            { key: 'get', title: 'Leer CDA', type: 'boolean' },
            { key: 'list', title: 'Listar CDA por paciente', type: 'boolean' },
            { key: 'post', title: 'Generar CDA', type: 'boolean' },
            { key: 'organizacion', title: 'Seleccionar organización', type: 'boolean' },
            { key: 'paciente', title: 'Setear paciente', type: 'boolean' },
        ]
    },
    {
        key: 'reportes',
        title: 'Modulo Reportes',
        child: [
        ]
    },
    {
        key: 'descargas',
        title: 'Descarga de Documentos',
        child: [
            { key: 'pdf', title: 'Documentos PDF', type: 'boolean' }
        ]
    },
    {
        key: 'solicitudes',
        title: 'Modulo Solicitudes',
        comment: '',
        // avoidAll: true,
        child: [
            {
                key: 'tipoPrestacion',
                title: 'Vista / Edición de Solicitudes',
                type: 'prestacion'
                // avoidAll: true
            },
            {
                key: 'reglas',
                title: 'Edición de Reglas',
                type: 'boolean'
            },
            {
                key: 'anular',
                title: 'Anular Solicitudes',
                type: 'boolean'
            }
        ]
    },
    {
        key: 'prestamos',
        title: 'Prestamo de Carpetas',
        child: [
        ]
    },
    {
        key: 'auditoriaPacientes',
        title: 'Auditoria Pacientes',
        comment: '',
        child: []
    }, {
        key: 'espaciosFisicos',
        title: 'Edición de espacios físicos',
        child: [
        ]
    },
    {
        key: 'turnosPrestaciones',
        title: 'Buscador de turnos y prestaciones para recupero financiero',
        child: [
            {
                key: 'buscar',
                title: 'Buscar prestaciones de pacientes',
                type: 'boolean'
            },
        ]
    },

];
