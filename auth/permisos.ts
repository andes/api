export default [
    {
        key: 'citas',
        title: 'Modulo Citas',
        comment: 'Nada aun',
        child: [

        ]
    },
    {
        key: 'mpi',
        title: 'Modulo MPI',
        comment: 'Nada aun',
        child: [
            {
                key: 'bloque',
                title: 'Bloques de pacientes similares',
                child: [
                    {
                        key: 'get',
                        type: 'boolean'
                    }
                ]
            },
            {
                key: 'matching',
                title: 'Matching de pacientes',
                child: [
                    {
                        key: 'get',
                        type: 'boolean',
                        title: 'Obtener porcentajes de matcheo'
                    },
                    {
                        key: 'patch',
                        type: 'boolean'
                    },
                    {
                        key: 'put',
                        type: 'boolean'
                    }
                ]
            },
            {
                key: 'paciente',
                title: 'ABM de pacientes',
                child: [
                    {
                        key: 'dashboard',
                        title: 'Dashboard',
                        type: 'boolean'
                    },
                    {
                        key: 'getbyId',
                        title: 'Detalle de un paciente',
                        type: 'boolean'
                    },
                    {
                        key: 'elasticSearch',
                        title: 'Busqueda de un paciente',
                        type: 'boolean'
                    },
                    {
                        key: 'putMpi',
                        title: 'Actualización de un paciente MPI',
                        type: 'boolean'
                    },
                    {
                        key: 'deleteMpi',
                        title: 'Eliminar un paciente MPI',
                        type: 'boolean'
                    },
                    {
                        key: 'postAndes',
                        title: 'Creacion de un paciente',
                        type: 'boolean'
                    },
                    {
                        key: 'putAndes',
                        title: 'Actualización de un paciente',
                        type: 'boolean'
                    },
                    {
                        key: 'deleteAndes',
                        title: 'Eliminar un paciente',
                        type: 'boolean'
                    },
                    {
                        key: 'patchAndes',
                        title: 'Modificar datos de un paciente',
                        type: 'boolean'
                    }
                ]

            },

        ]
    },
    {
        key: 'rup',
        title: 'Modulo RUP',
        comment: 'Nada aun',
        child: [

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
                    {
                        key: 'anses',
                        title: 'ANSES',
                        type: 'boolean'
                    },
                    {
                        key: 'sintys',
                        title: 'SINTYS',
                        type: 'boolean'
                    },
                    {
                        key: 'sisa',
                        title: 'SISA',
                        type: 'boolean'
                    }
                ]
            }
        ]
    },
    {
        key: 'log',
        title: 'Logueo',
        comment: '',
        child: [
            {
                key: 'post',
                title: 'Escritura',
                type: 'boolean'
            },
            {
                key: 'get',
                title: 'Lectura',
                type: 'boolean'
            }

        ]
    },
    {
        key: 'usuarios',
        title: 'Gestor de usuarios',
        child: [
            {
                key: 'get',
                title: 'Lectura de permisos',
                type: 'boolean'
            },
            {
                key: 'set',
                title: 'Modificacion de permisos',
                type: 'boolean'
            }
        ]
    }
];
