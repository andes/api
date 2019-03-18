/*
* key es lo que se guarda en la base de datos, separado por : para indicar subpermiso
* title es el nombre que se muestra en pantalla para referirse al permiso
* comment es el title de HTML que ayuda a entender el permiso. Si el permiso no tiene comentario, se mostrará
*       el título como ayuda. No agregarlo vacío -> comment: '', porque queda vacío la ayuda en HTML
*/
export default [
    {
        key: 'turnos',
        title: 'Módulo Citas',
        child: [
            {
                key: 'crearAgendas',
                title: 'Crear Agendas',
                type: 'boolean'
            },
            {
                key: 'editarEspacio',
                title: 'Agregar espacios físicos',
                comment: 'Agregar espacios físicos en una agenda',
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
                title: 'Planificación de agenda',
                comment: 'Agregar prestaciones para poder crear las agendas',
                child: [
                    { key: 'prestacion', title: 'Tipo de prestación', type: 'prestacion' }
                ]
            },
            {
                key: 'agenda',
                title: 'Operaciones sobre agendas',
                comment: 'Habilita funciones del gestor',
                child: [
                    { key: 'puedeEditar', title: 'Editar agenda', type: 'boolean' },
                    { key: 'puedeSuspender', title: 'Suspender', type: 'boolean' },
                    { key: 'puedeHabilitar', title: 'Habilitar agenda', type: 'boolean' },
                    { key: 'puedePublicar', title: 'Publicar agenda', type: 'boolean' },
                    { key: 'puedePausar', title: 'Pausar agenda', type: 'boolean' },
                    { key: 'puedeReanudar', title: 'Reanudar agenda', type: 'boolean' },
                    { key: 'puedeClonar', title: 'Clonar agenda', type: 'boolean' },
                    { key: 'puedeDarSobreturno', title: 'Dar Sobreturno agenda', type: 'boolean' },
                    { key: 'puedeImprimir', title: 'Revisar-Imprimir agenda', comment: 'Habilita botón Auditoría de agendas', type: 'boolean' },
                    { key: 'puedeReasignar', title: 'Reasignar Turno', type: 'boolean' },
                    { key: 'puedeEditarCarpeta', title: 'Editar número de carpeta', type: 'boolean' },
                    { key: 'puedeBorrar', title: 'Borrar agenda', comment: 'Borra agendas en planificación', type: 'boolean' },
                ]
            },
            {
                key: 'turnos',
                title: 'Operaciones sobre turnos',
                comment: 'Operaciones sobre turnos desde el gestor de agendas',
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
                    { key: 'prestacion', title: 'Tipo de prestación', type: 'prestacion' },
                    { key: 'delDia', title: 'Turnos del día', type: 'boolean' },
                    { key: 'paraProfesional', title: 'Para profesional', type: 'boolean' },
                    { key: 'programados', title: 'Turnos programados', type: 'boolean' }
                ]
            },
            {
                key: 'puntoInicio',
                title: 'Punto Inicio',
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
        title: 'Módulo MPI',
        comment: 'Ingresar y editar datos de pacientes',
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
                    { key: 'elasticSearch', title: 'Búsqueda de un paciente', type: 'boolean' },
                    { key: 'putMpi', title: 'Actualización de un paciente MPI', type: 'boolean' },
                    { key: 'deleteMpi', title: 'Eliminar un paciente MPI', type: 'boolean' },
                    { key: 'postAndes', title: 'Creación de un paciente', type: 'boolean' },
                    { key: 'putAndes', title: 'Actualización de un paciente', type: 'boolean' },
                    { key: 'deleteAndes', title: 'Eliminar un paciente', type: 'boolean' },
                    { key: 'patchAndes', title: 'Modificar datos de un paciente', type: 'boolean' },
                    { key: 'parentesco', title: 'Obtener parentesco', type: 'boolean' }
                ]

            },

        ]
    },
    {
        key: 'rup',
        title: 'Módulo RUP',
        comment: 'Habilita permisos sobre prestaciones solo para profesionales matriculados',
        avoidAll: true,
        child: [
            { key: 'tipoPrestacion', title: 'Tipo de prestación', type: 'prestacion', avoidAll: true }
        ]
    },
    {
        key: 'internacion',
        title: 'Módulo Internación',
        child: [
            {
                key: 'cama',
                title: 'Acciones sobre una cama',
                child: [
                    { key: 'create', title: 'Crear nueva cama', type: 'boolean' },
                    { key: 'baja', title: 'Eliminar cama', type: 'boolean' }
                ]
            },
            { key: 'censo', title: 'Ver censo diario y mensual', type: 'boolean' },
            { key: 'alta', title: 'Ingregar paciente', type: 'boolean' },
            { key: 'inicio', title: 'Punto de inicio', type: 'boolean' }
        ]

    },
    {
        key: 'huds',
        title: 'Módulo HUDS',
        comment: 'Visualiza historias de salud',
        avoidAll: true,
        child: [
            { key: 'visualizacionHuds', title: 'Visualización HUDS por paciente', type: 'boolean' },
        ]
    },
    {
        key: 'fa',
        title: 'Fuentes Auténticas',
        comment: 'Habilita el botón Validar con RENAPER en MPI',
        child: [
            {
                key: 'get',
                title: 'Consulta a fuentes aunténticas',
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
        child: [
            { key: 'post', title: 'Escritura', type: 'boolean' },
            { key: 'get', title: 'Lectura', type: 'boolean' }

        ]
    },
    {
        key: 'usuarios',
        title: 'Gestor de usuarios',
        child: [
            { key: 'set', title: 'Modificación de permisos', type: 'boolean' },
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
        child: [
            {
                key: 'profesionales',
                title: 'Gestor de profesionales',
                child: [
                    { key: 'getProfesional', title: 'Ver profesional', type: 'boolean' },
                    { key: 'getProfesionalFoto', title: 'Ver foto profesional', type: 'boolean' },
                    { key: 'postProfesional', title: 'Crea profesional', type: 'boolean' },
                    { key: 'putProfesional', title: 'Actualiza profesional', type: 'boolean' },
                    { key: 'deleteProfesional', title: 'Borrar profesional', type: 'boolean' }
                ]
            },
            {
                key: 'turnos',
                title: 'Gestor de turnos',
                child: [
                    { key: 'postTurno', title: 'insert turno', type: 'boolean' },
                    { key: 'postTurnoTipo', title: '', type: 'boolean' },
                    { key: 'getTurnosProximos', title: 'Trae próximos turnos', type: 'boolean' },
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
        comment: 'Tablas maestras para agregar organizaciones',
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
        title: 'Módulo CDA',
        comment: 'Habilita ver el registro histórico de otros sistemas',
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
        title: 'Módulo Reportes',
        comment: 'Estadística',
        child: [
        ]
    },
    {
        key: 'descargas',
        title: 'Descarga de Documentos',
        comment: 'Descarga resumen de RUP',
        child: [
            { key: 'pdf', title: 'Documentos PDF', type: 'boolean' }
        ]
    },
    {
        key: 'solicitudes',
        title: 'Módulo Solicitudes',
        comment: 'Módulo de tránsito ordenado de pacientes',
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
        title: 'Préstamo de Carpetas',
        comment: 'Archivo de Historia Clínica en papel',
        child: [
        ]
    },
    {
        key: 'auditoriaPacientes',
        title: 'Auditoría Pacientes',
        child: []
    }, {
        key: 'espaciosFisicos',
        title: 'Edición de espacios físicos',
        comment: 'Agregar/editar espacios de la organización',
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
