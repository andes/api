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
            let registros = unaPrestacion.ejecucion.registros;
            let registrosInternos = [];
            registros.forEach(registro => {
                if (registro.hasSections) { // COLONO O EPICRISIS
                    registro.registros.forEach(seccion => {
                        if (seccion.isSection && !seccion.noIndex) {
                            if (seccion.concepto.conceptId === '3641000013106') {
                                seccion.registros = seccion.registros.map(r => { r.esDiagnosticoPrincipal = true; return r; });
                            }
                            registrosInternos = [...registrosInternos, ...seccion.registros];
                        }
                    });
                }
            });
            registros = [...registros, ...registrosInternos];
            registros = registros.filter(f => {
                return f.concepto.semanticTag !== 'elemento de registro';
            });
            if (registros && registros.length) {
                registros.forEach(async registro => {
                    const parametros = {
                        conceptId: registro.concepto.conceptId,
                        paciente: unaPrestacion.paciente,
                        secondaryConcepts: registros.map(r => r.concepto.conceptId)
                    };
                    const map = new SnomedCIE10Mapping(parametros.paciente, parametros.secondaryConcepts);
                    try {
                        let codigoCie10: any = {
                            codigo: 'Mapeo no disponible'
                        };
                        let target = await map.transform(parametros.conceptId);
                        if (target) {
                            let cie = await cie10.model.findOne({
                                codigo: (target as String).substring(0, 5)
                            });
                            if (cie != null) {
                                codigoCie10 = {
                                    causa: (cie as any).causa,
                                    subcausa: (cie as any).subcausa,
                                    codigo: (cie as any).codigo,
                                    nombre: (cie as any).nombre,
                                    sinonimo: (cie as any).sinonimo,
                                    c2: (cie as any).c2,
                                    reporteC2: (cie as any).reporteC2,
                                    ficha: (cie as any).ficha
                                };
                            }
                        }
                        if (registro.esDiagnosticoPrincipal) {
                            codificaciones.unshift({ // El diagnostico principal se inserta al comienzo del array
                                codificacionProfesional: {
                                    snomed: {
                                        conceptId: registro.concepto.conceptId,
                                        term: registro.concepto.term,
                                        fsn: registro.concepto.fsn,
                                        semanticTag: registro.concepto.semanticTag
                                    },
                                    cie10: codigoCie10
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
                                        semanticTag: registro.concepto.semanticTag
                                    },
                                    cie10: codigoCie10
                                },
                                primeraVez: registro.esPrimeraVez
                            });
                        }

                        if (registros.length === codificaciones.length) {
                            resolve(codificaciones);
                        }

                    } catch (error) {
                        reject(error);
                    }
                });
            } else {
                return resolve(null);
            }
        } else {
            return resolve(null);
        }
    });
}
