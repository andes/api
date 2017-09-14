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
                        type: 'boolean'
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
                        title: 'Dashboard'
                    },
                    {
                        key: 'getbyId',
                        title: 'Detalle de un paciente'
                    },
                    {
                        key: 'elasticSearch',
                        title: 'Busqueda de un paciente'
                    },
                    {
                        key: 'putMpi',
                        title: 'Actualización de un paciente MPI'
                    },
                    {
                        key: 'deleteMpi',
                        title: 'Eliminar un paciente MPI'
                    },
                    {
                        key: 'postAndes',
                        title: 'Creacion de un paciente'
                    },
                    {
                        key: 'putAndes',
                        title: 'Actualización de un paciente'
                    },
                    {
                        key: 'deleteAndes',
                        title: 'Eliminar un paciente'
                    },
                    {
                        key: 'patchAndes',
                        title: 'Modificar datos de un paciente'
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
        title: 'Gesto de usuarios',
        child: [
            {
                key: 'get',
                title: 'Lectura',
                type: 'boolean'
            },
            {
                key: 'get',
                title: 'Lectura',
                type: 'boolean'
            }
        ]
    }
];
