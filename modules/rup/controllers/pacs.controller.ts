import { handleHttpRequest } from '../../../utils/requestHandler';
import { PacsServer } from '@andes/pacs-server';
import * as moment from 'moment';

export async function sendMessage(message) {
    const server = new PacsServer('172.16.1.38', 8001);
    const resp = await server.send(message);
    return resp;
}

export async function makeMessage(config, data) {
    const url = 'https://o576kx7og6.execute-api.us-east-1.amazonaws.com/dev/adtmsgs';
    const options = {
        method: 'POST',
        uri: url,
        body: [
            config,
            data
        ],
        json: true // Automatically stringifies the body to JSON
    };

    const [status, body] = await handleHttpRequest(options);
    const { message } = body;

    require('fs').writeFile('/home/mbotta/tmp.txt', message, () => { });

    const m: string = message.replace('\n', '\r').replace('\n', '\r').replace('\n', '\r').replace('\n', '\r');


    // for (let i = 0; i < message.length; i++) { if (m.charCodeAt(i) === 10) { m.; } }

    return String(m + '\n');
}

const sexoMap = {
    masculino: 'M',
    femenino: 'F',
    default: 'O'
};

export async function A04Message(paciente, organizacion) {
    paciente = { ...paciente };
    paciente.organizacion = organizacion;
    paciente.sexo = sexoMap[paciente.sexo] || sexoMap.default;
    paciente.fechaNacimiento = moment(paciente.fechaNacimiento).format('YYYYMMDD');
    paciente.message_datetime = moment().format('YYYYMMDDHHMM');
    return await makeMessage(a04Config, paciente);
}

export async function O01Message(prestacion) {
    const dto = {
        _id: String(prestacion._id),
        paciente: prestacion.paciente,
        organizacion: prestacion.solicitud.organizacion,
        profesional: prestacion.solicitud.profesional,
        procedure: {
            id: prestacion.solicitud.tipoPrestacion.conceptId,
            description: prestacion.solicitud.tipoPrestacion.term,
        },
        modalidad: 'US',
        fecha: moment(prestacion.ejecucion.fecha).format('YYYYMMDD'),
        message_datetime: moment().format('YYYYMMDDHHMM')
    };
    return await makeMessage(o01Config, dto);
}

const o01Config = {
    format: 'hl7-2.4',
    adapter: 'default',
    delimiters: {
        fieldSeperator: '|',
        componentSeperator: '^',
        subcomponentSeperator: '&',
        escapeCharacter: '\\',
        repititionCharacter: '~',
        segmentSeperator: '\r'
    },
    mappings: {
        msh: {
            configuration: {
                components: {
                    count: 17,
                    seperators: [
                        {
                            position: 5,
                            numberOfSeparator: 1
                        }
                    ]
                }
            },
            values: [
                {
                    field: 'encoding_character',
                    component: [
                        0,
                        1
                    ],
                    default: 'andes'
                },
                {
                    field: 'organizacion.nombre',
                    component: [
                        1,
                        1
                    ],
                    default: 'Hospital Provincial Neuquen'
                },
                {
                    field: 'sending_facility',
                    component: [
                        2,
                        1
                    ],
                    default: 'Synapse'
                },
                {
                    field: 'organizacion.nombre',
                    component: [
                        3,
                        1
                    ],
                    default: 'Hospital Provincial Neuquen'
                },
                {
                    field: 'message_datetime',
                    component: [
                        4,
                        1
                    ]
                },
                {
                    field: 'security',
                    component: [
                        5,
                        1
                    ]
                },
                {
                    field: 'message_type',
                    component: [
                        6,
                        1
                    ],
                    default: 'ORM'
                },
                {
                    field: 'message_type_ref',
                    component: [
                        6,
                        2
                    ],
                    default: 'O01'
                },
                {
                    field: 'message_control_id',
                    component: [
                        7,
                        1
                    ],
                    default: '154779'
                },
                {
                    field: 'processing_id',
                    component: [
                        8,
                        1
                    ],
                    default: 'P'
                },
                {
                    field: 'version_id',
                    component: [
                        9,
                        1
                    ],
                    default: '2.3.1'
                },
                {
                    field: '',
                    component: [
                        10,
                        1
                    ]
                },
                {
                    field: 'continuation_pointer',
                    component: [
                        11,
                        1
                    ]
                },
                {
                    field: 'accept_acknowledgment_type',
                    component: [
                        12,
                        1
                    ]
                },
                {
                    field: 'application_acknowledgment_type',
                    component: [
                        13,
                        1
                    ]
                },
                {
                    field: 'country_code',
                    component: [
                        14,
                        1
                    ],
                    default: 'AR'
                },
                {
                    field: 'character_set',
                    component: [
                        15,
                        1
                    ],
                    default: 'UTF-8'
                },
                {
                    field: 'principal_language_of_message',
                    component: [
                        16,
                        1
                    ]
                },
                {
                    field: 'alternate_character_set',
                    component: [
                        17,
                        1
                    ]
                }
            ]
        },
        pid: {
            configuration: {
                components: {
                    count: 3,
                    seperators: []
                }
            },
            values: [
                {
                    field: 'paciente.id',
                    component: [
                        2,
                        1
                    ]
                }
            ]
        },
        orc: {
            configuration: {
                components: {
                    count: 5,
                    seperators: []
                }
            },
            values: [
                {
                    field: 'order_control',
                    component: [
                        0,
                        1
                    ],
                    default: 'NW'
                },
                {
                    field: '_id',
                    component: [
                        1,
                        1
                    ]
                },
                {
                    field: 'scheduler',
                    component: [
                        4,
                        1
                    ],
                    default: 'SC'
                }
            ]
        },
        obr: {
            configuration: {
                components: {
                    count: 44,
                    seperators: []
                }
            },
            values: [
                {
                    field: 'set_id',
                    component: [
                        0,
                        1
                    ]
                },
                {
                    field: '_id',
                    component: [
                        1,
                        1
                    ]
                },
                {
                    field: 'procedure.id',
                    component: [
                        3,
                        1
                    ]
                },
                {
                    field: 'procedure.description',
                    component: [
                        3,
                        2
                    ]
                },
                {
                    field: 'profesional.apellido',
                    component: [
                        15,
                        1
                    ]
                },
                {
                    field: 'profesional.nombre',
                    component: [
                        15,
                        2
                    ]
                },
                {
                    field: 'modalidad',
                    component: [
                        24,
                        1
                    ],
                    default: 'DX'
                },
                {
                    field: 'result_status',
                    component: [
                        25,
                        1
                    ],
                    default: 'U'
                },
                {
                    field: 'quantity_timing',
                    component: [
                        27,
                        1
                    ],
                    default: '1'
                },
                {
                    field: 'fecha',
                    component: [
                        27,
                        2
                    ]
                },
                {
                    field: 'quantity_timing',
                    component: [
                        27,
                        3
                    ],
                    default: 'R'
                }
            ]
        }
    }
};


export const a04Config = {
    format: 'hl7-2.3',
    adapter: 'default',
    delimiters: {
        fieldSeperator: '|',
        componentSeperator: '^',
        subcomponentSeperator: '&',
        escapeCharacter: '\\',
        repititionCharacter: '~',
        segmentSeperator: '\r'
    },
    mappings: {
        msh: {
            configuration: {
                components: {
                    count: 17,
                    seperators: [
                        {
                            position: 5,
                            numberOfSeparator: 1
                        }
                    ]
                }
            },
            values: [
                {
                    field: 'sending_application',
                    component: [
                        0,
                        1
                    ],
                    default: 'Andes'
                },
                {
                    field: 'sending_facility',
                    component: [
                        1,
                        1
                    ],
                    default: 'HPN'
                },
                {
                    field: 'receiving_application',
                    component: [
                        2,
                        1
                    ],
                    default: 'Synapse'
                },
                {
                    field: 'organizacion.nombre',
                    component: [
                        3,
                        1
                    ],
                    default: 'HOSPITAL PROVINCIAL NEUQUEN'
                },
                {
                    field: 'message_datetime',
                    component: [
                        4,
                        1
                    ]
                },
                {
                    field: 'security',
                    component: [
                        5,
                        1
                    ]
                },
                {
                    field: 'message_type',
                    component: [
                        6,
                        1
                    ],
                    default: 'ADT'
                },
                {
                    field: 'message_type_ref',
                    component: [
                        6,
                        2
                    ],
                    default: 'A04'
                },
                {
                    field: 'processing_id',
                    component: [
                        8,
                        1
                    ],
                    default: 'P'
                },
                {
                    field: 'version_id',
                    component: [
                        9,
                        1
                    ],
                    default: '2.3'
                },
                {
                    field: 'sequence_number',
                    component: [
                        10,
                        1
                    ]
                },
                {
                    field: 'continuation_pointer',
                    component: [
                        11,
                        1
                    ]
                },
                {
                    field: 'accept_acknowledgment_type',
                    component: [
                        12,
                        1
                    ]
                },
                {
                    field: 'application_acknowledgment_type',
                    component: [
                        13,
                        1
                    ]
                },
                {
                    field: 'country_code',
                    component: [
                        14,
                        1
                    ],
                    default: 'AR'
                },
                {
                    field: 'character_set',
                    component: [
                        15,
                        1
                    ],
                    default: 'UTF-8'
                },
                {
                    field: 'principal_language_of_message',
                    component: [
                        16,
                        1
                    ]
                },
                {
                    field: 'alternate_character_set',
                    component: [
                        17,
                        1
                    ]
                }
            ]
        },
        pid: {
            configuration: {
                components: {
                    count: 14,
                    seperators: []
                }
            },
            values: [
                {
                    field: 'id',
                    component: [
                        2,
                        1
                    ]
                },
                {
                    field: 'assigning_authority',
                    component: [
                        2,
                        4
                    ]
                },
                {
                    field: 'apellido',
                    component: [
                        4,
                        2
                    ]
                },
                {
                    field: 'nombre',
                    component: [
                        4,
                        1
                    ]
                },
                {
                    field: 'fechaNacimiento',
                    component: [
                        6,
                        1
                    ]
                },
                {
                    field: 'sexo',
                    component: [
                        7,
                        1
                    ]
                },
                {
                    field: 'patient_alias',
                    component: [
                        8,
                        1
                    ]
                },
                {
                    field: 'paciente.race',
                    component: [
                        9,
                        1
                    ]
                },
                {
                    field: 'address',
                    children: [
                        {
                            field: 'street',
                            component: [
                                10,
                                1
                            ]
                        },
                        {
                            field: 'street_2',
                            component: [
                                10,
                                2
                            ]
                        },
                        {
                            field: 'city',
                            component: [
                                10,
                                3
                            ]
                        },
                        {
                            field: 'state',
                            component: [
                                10,
                                4
                            ]
                        },
                        {
                            field: 'zipcode',
                            component: [
                                10,
                                5
                            ]
                        },
                        {
                            field: 'country',
                            component: [
                                10,
                                6
                            ]
                        },
                        {
                            field: 'address_type',
                            component: [
                                10,
                                7
                            ]
                        },
                        {
                            field: 'other_geographic_designation',
                            component: [
                                10,
                                8
                            ]
                        },
                        {
                            field: 'country_code',
                            component: [
                                10,
                                9
                            ]
                        },
                        {
                            field: 'census_tract',
                            component: [
                                10,
                                10
                            ]
                        }
                    ]
                },
                {
                    field: 'fiche.country_code',
                    component: [
                        11,
                        1
                    ]
                },
                {
                    field: 'fiche.contacts',
                    type: 'array',
                    children: [
                        {
                            field: 'number',
                            component: [
                                12,
                                1
                            ]
                        },
                        {
                            field: 'telecommunication_use_code',
                            component: [
                                12,
                                2
                            ]
                        },
                        {
                            field: 'telecommunication_equipment_code',
                            component: [
                                12,
                                3
                            ]
                        },
                        {
                            field: 'email',
                            component: [
                                12,
                                4
                            ]
                        },
                        {
                            field: 'country_code',
                            component: [
                                12,
                                5
                            ]
                        },
                        {
                            field: 'area_code',
                            component: [
                                12,
                                6
                            ]
                        },
                        {
                            field: 'phone_number',
                            component: [
                                12,
                                7
                            ]
                        },
                        {
                            field: 'extension',
                            component: [
                                12,
                                8
                            ]
                        }
                    ]
                }
            ]
        },
        pv1: {
            configuration: {
                components: {
                    count: 3,
                    seperators: []
                }
            },
            values: [
                {
                    field: 'arrival.id',
                    component: [
                        0,
                        1
                    ]
                },
                {
                    field: 'arrival.patient',
                    component: [
                        1,
                        1
                    ],
                    default: 'U'
                }
            ]
        }
    }
};
