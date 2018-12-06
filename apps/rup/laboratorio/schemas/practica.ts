import { schema as AreaLaboratorio } from './areaLaboratorio';
import { SnomedConcept } from './../../../../modules/rup/schemas/snomed-concept';
import {  model, Schema } from 'mongoose';


// tslint:disable
export let schema = new Schema({
    codigo: {
        type: String,
        required: false
    },
    codigoNomenclador: {
        type: String,
        required: false
    },
    nombre: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: true
    },
    concepto: SnomedConcept,
    sistema: SnomedConcept,
    tipoLaboratorio: {
        nombre: {
            type: String,
            required: true
        },
        nomencladorProvincial: {
            type: String,
            required: true
        }
    },
    area: AreaLaboratorio,
    categoria: {
        type: String,
        required: true
    },
    ordenImpresion: {
        type: Number,
        required: false
    },
    unidadMedida: SnomedConcept,
    diagrama: {
        type: String,
        required: false
    },
    resultado: {
        sinMuestra: Boolean,
        formato: {
            tipo: {
                type: String,
                required: true
            },
            decimales: {
                type: Number,
                required: false
            },
            exponencial: {
                type: Boolean,
                required: false
            },
            multiplicador: {
                type: Number,
                required: false
            }
        },
        valorDefault: {
            type: Object,
            required: false
        },
        resultadosAnteriores: [
            {
                valor: {
                    type: Number,
                    required: false
                },
                unidadMedida: SnomedConcept,
                fechaTomaMuestra: {
                    type: Date,
                    required: false,
                    es_indexed: true
                }

            }
        ]

    },
    reactivos: [
        {
            fabricante: {
                type: String,
                required: false
            },
            denominacion: {
                type: String,
                required: false
            },
            numeroReferencia: {
                type: String,
                required: false
            },
            valoresReferencia: [
                {
                    sexo: {
                        type: String,
                        required: false
                    },
                    edadDesde: {
                        type: Number,
                        required: false
                    },
                    edadHasta: {
                        type: Number,
                        required: false
                    },
                    unidadEdad: {
                        type: Number,
                        required: false
                    },
                    metodo: {
                        type: Number,
                        required: false
                    },
                    tipoValor: {
                        type: Number,
                        required: false
                    },
                    valorMinimo: {
                        type: Number,
                        required: true
                    },
                    valorMaximo: {
                        type: Number,
                        required: true
                    },
                    observacion: {
                        type: String,
                        required: false
                    }
                }
            ]
        }
    ],
    valoresCriticos: {
        minimo: {
            type: Number,
            required: true
        },
        maximo: {
            type: Number,
            required: true
        }
    },
    etiquetaAdicional: {
        type: Boolean,
        required: true
    },
    recomendaciones: [{
        type: String,
        required: true
    }],
    factorProduccion: {
        menor50: {
            type: Number,
            required: true
        },
        de50a100: {
            type: Number,
            required: true
        },
        mayor100: {
            type: Number,
            required: true
        }
    },
    requeridos: []
});

// // Valida el esquema
// schema.pre('save', function (next) {
//     let protocolo: any = this;

//     if (!protocolo.fechaTomaMuestra) {
//         let err = new Error('Debe ingresar una fecha de toma de muestra');
//         return next(err);
//     }

//     if (!protocolo.obraSocial) {
//         let err = new Error('Debe seleccionar una obra social');
//         return next(err);
//     }

//     next();
// });


// Habilitar plugin de auditoría 
schema.plugin(require('../../../../mongoose/audit'));

export let Practica = model('practica', schema, 'practica');
