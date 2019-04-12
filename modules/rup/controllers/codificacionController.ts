import { SnomedCIE10Mapping } from '../../../core/term/controller/mapping';
import * as cie10 from './../../../core/term/schemas/cie10';
import { EventCore } from '@andes/event-bus';
import * as codificacion from '../schemas/codificacion';

EventCore.on('rup:prestacion:romperValidacion', async (prestacion) => {
    await codificacion.findOneAndRemove({ idPrestacion: prestacion.id });
});

export function codificarPrestacion(unaPrestacion: any) {
    return new Promise((resolve, reject) => {
        const codificaciones = [];
        if (unaPrestacion.ejecucion) {
            const registros = unaPrestacion.ejecucion.registros.filter(f => {
                return f.concepto.semanticTag !== 'elemento de registro';
            });
            registros.forEach(registro => {
                const parametros = {
                    conceptId: registro.concepto.conceptId,
                    paciente: unaPrestacion.paciente,
                    secondaryConcepts: registros.map(r => r.concepto.conceptId)
                };
                const map = new SnomedCIE10Mapping(parametros.paciente, parametros.secondaryConcepts);
                map.transform(parametros.conceptId).then(target => {
                    if (target) {
                        // Buscar en cie10 los primeros 5 digitos
                        cie10.model.findOne({
                            codigo: (target as String).substring(0, 5)
                        }).then(cie => {
                            if (cie != null) {
                                if (registro.esDiagnosticoPrincipal) {
                                    codificaciones.unshift({ // El diagnostico principal se inserta al comienzo del array
                                        codificacionProfesional: {
                                            snomed: {
                                                conceptId: registro.concepto.conceptId,
                                                term: registro.concepto.term,
                                                fsn: registro.concepto.fsn,
                                                semanticTag: registro.concepto.semanticTag,
                                                refsetIds: registro.concepto.refsetIds
                                            },
                                            cie10: {
                                                causa: (cie as any).causa,
                                                subcausa: (cie as any).subcausa,
                                                codigo: (cie as any).codigo,
                                                nombre: (cie as any).nombre,
                                                sinonimo: (cie as any).sinonimo,
                                                c2: (cie as any).c2,
                                                reporteC2: (cie as any).reporteC2,
                                                ficha: (cie as any).ficha
                                            }
                                        },
                                        primeraVez: registro.esPrimeraVez,
                                    });

                                } else {
                                    codificaciones.push({
                                        codificacionProfesional: {
                                            snomed: {
                                                conceptId: registro.concepto.conceptId,
                                                term: registro.concepto.term,
                                                fsn: registro.concepto.fsn,
                                                semanticTag: registro.concepto.semanticTag,
                                                refsetIds: registro.concepto.refsetIds
                                            },
                                            cie10: {
                                                causa: (cie as any).causa,
                                                subcausa: (cie as any).subcausa,
                                                codigo: (cie as any).codigo,
                                                nombre: (cie as any).nombre,
                                                sinonimo: (cie as any).sinonimo,
                                                c2: (cie as any).c2,
                                                reporteC2: (cie as any).reporteC2,
                                                ficha: (cie as any).ficha
                                            }
                                        },
                                        primeraVez: registro.esPrimeraVez
                                    });
                                }
                            } else {
                                codificaciones.push({
                                    codificacionProfesional: {
                                        snomed: {
                                            conceptId: registro.concepto.conceptId,
                                            term: registro.concepto.term,
                                            fsn: registro.concepto.fsn,
                                            semanticTag: registro.concepto.semanticTag,
                                            refsetIds: registro.concepto.refsetIds
                                        },
                                        cie10: {
                                            codigo: 'Mapeo no disponible'
                                        }
                                    },
                                    primeraVez: registro.esPrimeraVez
                                });
                            }
                            if (registros.length === codificaciones.length) {
                                // turno.diagnostico = {
                                //     ilegible: false,
                                //     codificaciones: codificaciones.filter(cod => Object.keys(cod).length > 0)
                                // };
                                // turno.asistencia = 'asistio';
                                resolve(codificaciones);
                            }

                        }).catch(err1 => {
                            reject(err1);
                        });
                    } else {
                        codificaciones.push({
                            codificacionProfesional: {
                                snomed: {
                                    conceptId: registro.concepto.conceptId,
                                    term: registro.concepto.term,
                                    fsn: registro.concepto.fsn,
                                    semanticTag: registro.concepto.semanticTag,
                                    refsetIds: registro.concepto.refsetIds
                                },
                                cie10: {
                                    codigo: 'Mapeo no disponible'
                                }
                            },
                            primeraVez: registro.esPrimeraVez
                        });
                        if (registros.length === codificaciones.length) {
                            // turno.diagnostico = {
                            //     ilegible: false,
                            //     codificaciones: codificaciones.filter(cod => Object.keys(cod).length > 0)
                            // };
                            // turno.asistencia = 'asistio';
                            resolve(codificaciones);
                        }
                    }
                }).catch(error => {
                    reject(error);
                });
            });
        } else {
            return resolve(null);
        }
    });
}
