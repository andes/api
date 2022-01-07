/**
 *
 * https://www.npmjs.com/package/shiro-trie
 * key es lo que se guarda en la base de datos, separado por : para indicar subpermiso
 * title es el nombre que se muestra en pantalla para referirse al permiso
 * comment es el title de HTML que ayuda a entender el permiso. Si el permiso no tiene comentario, se mostrará
 *       el título como ayuda. No agregarlo vacío -> comment: '', porque queda vacío la ayuda en HTML
 **/
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
                title: 'Editar espacios físicos',
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
                title: 'Planificacion de agenda',
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
                    { key: 'read', title: 'Ver Agendas', comment: 'ver agenda publicada', type: 'boolean' },
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
                    { key: 'puedeRevision', title: 'Revisar agenda', comment: 'Revisión de agendas', type: 'boolean' },
                    { key: 'puedeNota', title: 'Agregar nota', comment: 'Agregar nota', type: 'boolean' },
                    { key: 'asignacionMasiva', title: 'Asignación masiva', comment: 'Asignar pacientes de agenda por lote', type: 'boolean' }
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
                    { key: 'prestacion', title: 'Tipo de prestación', type: 'prestacion', subtype: 'ambulatorio' },
                    { key: 'delDia', title: 'Turnos del día', type: 'boolean' },
                    { key: 'paraProfesional', title: 'Para profesional', type: 'boolean' },
                    { key: 'programados', title: 'Turnos programados', type: 'boolean' }
                ]
            },
            {
                key: 'puntoInicio',
                title: 'Punto Inicio',
                child: [
                    { key: 'read', title: 'Ver Turnos', type: 'boolean' },
                    { key: 'solicitud', title: 'Registrar solicitud', type: 'boolean' },
                    { key: 'autocitado', title: 'Registrar Autocitación', type: 'boolean' },
                    { key: 'darTurnos', title: 'Dar turnos desde punto inicio', type: 'boolean' },
                    { key: 'puedeEditarCarpeta', title: 'Editar número de carpeta', type: 'boolean' },
                    { key: 'activarMobile', title: 'Activar App Mobile', type: 'boolean' },
                    { key: 'darSobreturno', title: 'Dar sobreturno', type: 'boolean' },

                ]
            }
        ]
    },
    {
        key: 'mpi',
        title: 'Módulo MPI',
        comment: 'Ingresar y editar datos de pacientes',
        child: [
            {
                key: 'paciente',
                title: 'ABM de pacientes',
                child: [
                    { key: 'getbyId', title: 'Detalle de un paciente', type: 'boolean' },
                    { key: 'postAndes', title: 'Creación de un paciente', type: 'boolean' },
                    { key: 'putAndes', title: 'Actualización de un paciente', type: 'boolean' },
                    { key: 'deleteAndes', title: 'Eliminar un paciente', type: 'boolean' },
                    { key: 'patchAndes', title: 'Modificar datos de un paciente', type: 'boolean' },
                    { key: 'parentesco', title: 'Obtener parentesco', type: 'boolean' },
                    { key: 'documentacion', title: 'Documentación adjunta', type: 'boolean' },
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
            { key: 'tipoPrestacion', title: 'Tipo de prestación', type: 'prestacion', avoidAll: true },
            { key: 'validacion', title: 'Validación extras', type: 'prestacion', avoidAll: true },
            { key: 'servicio-intermedio', title: 'Servicio Intermedio', type: 'servicio-intermedio', avoidAll: true, visibility: 'restricted' }
        ]
    },
    {
        key: 'internacion',
        title: 'Módulo Internación',
        comment: '',
        avoidAll: true,
        child: [
            {
                key: 'rol',
                title: 'Rol del usuario',
                avoidAll: true,
                child: [
                    { key: 'medica', title: 'Médico', type: 'boolean' },
                    { key: 'enfermeria', title: 'Enfermero', type: 'boolean' },
                    { key: 'estadistica', title: 'Estadístico', type: 'boolean' },
                    { key: 'interconsultores', title: 'Interconsultor', type: 'boolean' }
                    { key: 'estadistica-v2', title: 'Estadístico (nuevo)', type: 'boolean' }
                ]
            },
            {
                key: 'cama',
                title: 'Acciones sobre una cama',
                child: [
                    { key: 'create', title: 'Crear nueva cama', type: 'boolean' },
                    { key: 'edit', title: 'Editar cama', type: 'boolean' },
                    { key: 'baja', title: 'Eliminar cama', type: 'boolean' }
                ]
            },
            {
                key: 'sala',
                title: 'Acciones sobre una sala',
                child: [
                    { key: 'create', title: 'Crear nueva sala', type: 'boolean' },
                    { key: 'edit', title: 'Editar sala', type: 'boolean' },
                    { key: 'delete', title: 'Eliminar sala', type: 'boolean' }
                ]
            },
            { key: 'ingreso', title: 'Realizar ingreso de pacientes', type: 'boolean' },
            { key: 'movimientos', title: 'Realizar movimientos de internacion', type: 'boolean' },
            { key: 'egreso', title: 'Realizar egreso de pacientes', type: 'boolean' },
            { key: 'bloqueo', title: 'Realizar bloqueo de camas', type: 'boolean' },
            { key: 'censo', title: 'Ver censo diario y mensual', type: 'boolean' },
            { key: 'inicio', title: 'Punto de inicio', type: 'boolean' },
            { key: 'mapaDeCamas', title: 'Mapa de camas', type: 'boolean' },
            { key: 'descargarListado', title: 'Descargar listado internación', type: 'boolean' },
            { key: 'registros', title: 'Ver registros de la internación', type: 'boolean' },
        ]

    },


    {
        key: 'guardia',
        title: 'Módulo Guardia',
        comment: '',
        avoidAll: true,
        visibility: 'restricted',
        child: [
            {
                key: 'rol',
                title: 'Rol del usuario',
                avoidAll: true,
                child: [
                    { key: 'medica', title: 'Médico', type: 'boolean' },
                    { key: 'enfermeria', title: 'Enfermero', type: 'boolean' },
                    { key: 'administrativa', title: 'Administrativo', type: 'boolean' },
                ]
            },
            {
                key: 'cama',
                title: 'Acciones sobre una cama',
                child: [
                    { key: 'create', title: 'Crear nueva cama', type: 'boolean' },
                    { key: 'edit', title: 'Editar cama', type: 'boolean' },
                    { key: 'baja', title: 'Eliminar cama', type: 'boolean' }
                ]
            },
            {
                key: 'sala',
                title: 'Acciones sobre una sala',
                child: [
                    { key: 'create', title: 'Crear nueva sala', type: 'boolean' },
                    { key: 'edit', title: 'Editar sala', type: 'boolean' },
                    { key: 'delete', title: 'Eliminar sala', type: 'boolean' }
                ]
            },
            { key: 'ingreso', title: 'Realizar ingreso de pacientes', type: 'boolean' },
            { key: 'movimientos', title: 'Realizar movimientos de internacion', type: 'boolean' },
            { key: 'egreso', title: 'Realizar egreso de pacientes', type: 'boolean' },
            { key: 'bloqueo', title: 'Realizar bloqueo de camas', type: 'boolean' },
            { key: 'censo', title: 'Ver censo diario y mensual', type: 'boolean' },
            { key: 'mapaDeCamas', title: 'Mapa de camas', type: 'boolean' },
            { key: 'descargarListado', title: 'Descargar listado internación', type: 'boolean' },
        ]

    },


    {
        key: 'huds',
        title: 'Módulo HUDS',
        comment: 'Visualiza historias de salud',
        avoidAll: true,
        child: [
            { key: 'visualizacionHuds', title: 'Visualización HUDS por paciente', type: 'boolean' },
            { key: 'impresion', title: 'Imprimir cualquier prestación', type: 'boolean', visibility: 'restricted' },
            { key: 'exportarHuds', title: 'Exportar HUDS de un paciente', type: 'boolean', visibility: 'restricted' }
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
        comment: '',
        child: [
            { key: 'post', title: 'Escritura', type: 'boolean' },
            { key: 'get', title: 'Lectura', type: 'boolean' }

        ]
    },
    {
        key: 'usuarios',
        title: 'Gestor de usuarios',
        avoidAll: true,
        child: [
            { key: 'read', title: 'Ver usuarios y permisos', type: 'boolean' },
            { key: 'write', title: 'Agregar/modificar permisos', type: 'boolean' },
            { key: 'perfiles', title: 'Crear/modificar perfiles de usuarios', visibility: 'restricted', type: 'boolean' }
        ]
    },
    {
        key: 'matriculaciones',
        title: 'Matriculaciones',
        comment: '',
        visibility: 'restricted',
        child: [
            {
                key: 'profesionales',
                title: 'Gestor de profesionales',
                child: [
                    { key: 'getProfesional', title: 'Ver profesional', type: 'boolean' },
                    { key: 'getProfesionalFoto', title: 'Ver foto de profesional', type: 'boolean' },
                    { key: 'postProfesional', title: 'Crear profesional', type: 'boolean' },
                    { key: 'putProfesional', title: 'Actualizar profesional', type: 'boolean' },
                    { key: 'deleteProfesional', title: 'Borrar profesional', type: 'boolean' }
                ]
            },
            {
                key: 'turnos',
                title: 'Gestor de turnos',
                child: [
                    { key: 'postTurno', title: 'Crear nuevo turno', type: 'boolean' },
                    { key: 'getTurnosProximos', title: 'Consultar próximos turnos', type: 'boolean' },
                    { key: 'getTurno', title: 'Ver turno', type: 'boolean' }
                ]
            },
            {
                key: 'agenda',
                title: 'Agenda',
                child: [
                    { key: 'postAgenda', title: 'Crear nueva agenda', type: 'boolean' },
                    { key: 'putAgenda', title: 'Actualizar agenda', type: 'boolean' }
                ]
            },
            {
                key: 'supervisor',
                title: 'supervisor',
                child: [
                    { key: 'aprobar', title: 'aprobar', type: 'boolean' },
                ]
            }, {
                key: 'reportes',
                title: 'Reportes',
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
        title: 'Auditoria Pacientes',
        comment: '',
        visibility: 'restricted',
        child: [
            {
                key: 'vincular',
                title: 'Vincular Pacientes, activar y desactivar sus vinculados',
                type: 'boolean'
            },
            {
                key: 'edicion',
                title: 'Edición de Pacientes Validados',
                type: 'boolean'
            }
        ]
    },
    {
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
            {
                key: 'emitirComprobante',
                title: 'Emitir comprobante',
                type: 'boolean'
            },
        ]
    },
    {
        key: 'campania',
        title: 'Campañas de salud',
        avoidAll: true,
        child: [
            {
                key: 'crear',
                title: 'Crear y modificar',
                comment: 'Permite crear y modificar campañas de salud',
                type: 'boolean'
            },
            {
                key: 'ver',
                title: 'Visualizar',
                comment: 'Habilita la visualización de campañas de salud',
                type: 'boolean'
            }
        ]
    },
    {
        key: 'visualizacionInformacion',
        title: 'Gestion de la visualización de información',
        child: [
            {
                key: 'dashboard',
                title: 'Panel de datos estadísticos en gráficos y tablas',
                child: [
                    {
                        key: 'citas', title: 'Dashboard Citas', child: [
                            { key: 'ver', title: 'Ver Dashboard Citas', type: 'boolean' },
                            { key: 'verProfesionales', title: 'Ver todos los profesionales', type: 'boolean' },
                            { key: 'tipoPrestacion', title: 'Tipo de prestación', type: 'prestacion' }]
                    },
                    {
                        key: 'top', title: 'Dashboard TOP', child: [
                            { key: 'ver', title: 'Ver Dashboard Top', type: 'boolean' }
                        ]
                    }
                ]
            },
            {
                key: 'reportes',
                title: 'Módulo Reportes',
                type: 'boolean'

            },
            {
                key: 'biQueries',
                title: 'Bi-Queries',
                type: 'queries'
            },
            {
                key: 'totalOrganizaciones',
                title: 'Todas las organizaciones',
                type: 'boolean'
            },
            {
                key: 'zonasSanitarias',
                title: 'Zonas sanitarias',
                type: 'zona-sanitaria'
            }
        ]
    },
    {
        key: 'perinatal',
        title: 'Módulo perinatal',
        child: [
            {
                key: 'ver',
                title: 'Consulta',
                type: 'boolean'
            },
            {
                key: 'editar',
                title: 'Edición',
                type: 'boolean'
            },
        ]
    },
    {
        key: 'vacunacion',
        title: 'Módulo vacunación',
        visibility: 'restricted',
        child: [
            {
                key: 'tipoGrupos',
                title: 'Visualización de grupos poblacionales',
                type: 'grupo-poblacional'
            },
            {
                key: 'editar',
                title: 'Editar inscripciones',
                child: [
                    {
                        key: 'estado',
                        title: 'Editar estado de inscripción',
                        type: 'boolean'
                    },
                    {
                        key: 'contacto',
                        title: 'Editar contacto de paciente',
                        type: 'boolean'
                    },
                    {
                        key: 'grupoPoblacional',
                        title: 'Editar grupo de paciente',
                        type: 'boolean'
                    },
                    {
                        key: 'domicilio',
                        title: 'Editar domicilio de paciente',
                        type: 'boolean'
                    }
                ]
            },
            {
                key: 'crear',
                title: 'Crear inscripciones',
                type: 'boolean'
            },
            {
                key: 'dacion-turnos',
                title: 'Dación de turnos',
                type: 'boolean'
            },
            {
                key: 'desasignar-inscriptos',
                title: 'Desasignar Inscriptos',
                type: 'boolean'
            },
            {
                key: 'crear-dosis-lote',
                title: 'crear lote y dosis',
                type: 'boolean'
            },
            {
                key: 'verificar-estado',
                title: 'Verificar estado de vacunación',
                type: 'boolean'
            }
        ]
    },
    {
        key: 'analytics',
        title: 'Analytics',
        visibility: 'restricted',
        comment: '',
        avoidAll: true,
        child: [
            { key: 'read', title: 'Acceso básico a Analytics', type: 'boolean' },
            { key: 'full', title: 'Acceso completo a analytics', type: 'boolean' },
        ]
    },
    {
        key: 'monitoreo',
        title: 'Monitoreo',
        visibility: 'restricted',
        child: [
            {
                key: 'conceptosTurneables',
                title: 'Conceptos turneables',
                type: 'boolean'
            },
            {
                key: 'webhook',
                title: 'Webhook',
                type: 'boolean'
            },
            {
                key: 'monitoreoActivaciones',
                title: 'Monitoreo activaciones',
                type: 'boolean'
            },
            {
                key: 'webhookLog',
                title: 'WebhookLog',
                type: 'boolean'
            },
            {
                key: 'regenerarCda',
                title: 'Regenerar CDA',
                type: 'boolean'
            },
            {
                key: 'novedades',
                title: 'Novedades',
                type: 'boolean'
            },
            {
                key: 'biQueries',
                title: 'BI Queries',
                type: 'boolean'
            },
            {
                key: 'buscadorSnomed',
                title: 'Buscador Snomed',
                type: 'boolean'
            },
            {
                key: 'modulos',
                title: 'Modulos',
                type: 'boolean'
            },
            {
                key: 'rupers',
                title: 'Rupers',
                type: 'boolean'
            }
        ]
    },
    {
        key: 'com',
        title: 'Centro Operativo Médico',
        visibility: 'restricted',
        comment: '',
        child: [
        ]
    },
    {
        key: 'formBuilder',
        avoidAll: true,
        visibility: 'restricted',
        title: 'Generador de formularios customizables',
        comment: '',
        child: [
            {
                key: 'create',
                title: 'Genearar nuevo',
                visibility: 'restricted',
                type: 'boolean'
            },
            {
                key: 'update',
                title: 'Modificar existente',
                visibility: 'restricted',
                type: 'boolean'
            },
            {
                key: 'read',
                title: 'Sólo lectura',
                visibility: 'restricted',
                type: 'boolean'
            }
        ]
    },
    {
        key: 'epidemiologia',
        title: 'Epidemiología',
        avoidAll: true,
        visibility: 'restricted',
        comment: '',
        child: [
            {
                key: 'create',
                title: 'Crear ficha',
                type: 'boolean'
            },
            {
                key: 'update',
                title: 'Editar ficha',
                type: 'boolean'
            },
            {
                key: 'read',
                title: 'Visualizar ficha',
                type: 'boolean'
            },
            {
                key: 'delete',
                title: 'Eliminar ficha',
                type: 'boolean'
            },
            {
                key: 'historial',
                title: 'Ver historial',
                type: 'boolean'
            },
            {
                key: 'seguimiento',
                title: 'Seguimiento de casos epidemiológicos',
                avoidAll: true,
                child: [
                    { key: 'auditoria', title: 'Auditoría de casos', type: 'boolean', visibility: 'restricted' },
                    { key: 'update', title: 'Seguimiento de casos', type: 'boolean' }
                ]
            }
        ]
    }
];
