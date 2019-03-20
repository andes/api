import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as camasController from './../controllers/cama';
import * as internacionesController from './../controllers/internacion';
import * as censoController from './../controllers/censo';


export function filtrarMovimientosIntraUO(camas) {
    let salida = [];
    camas.forEach(unaCama => {
        // buscamos si en la salida ya existe una cama ocupada con la misma internacion en la misma unidad organizativa
        let indiceEncontrado = salida.findIndex(c => (c.ultimoEstado.unidadOrganizativa.conceptId === unaCama.ultimoEstado.unidadOrganizativa.conceptId) && (c.ultimoEstado.idInternacion.toString() === unaCama.ultimoEstado.idInternacion.toString()));
        if (indiceEncontrado >= 0) {
            // Si existe vamos a coparar las fechas para quedarnos con la ultima ocupada
            let fechaEncontrada = moment(salida[indiceEncontrado].ultimoEstado.fecha);
            let fechaCama = moment(unaCama.ultimoEstado.fecha);
            // Solo si la fecha de la cama actual es posterior a la ya almacenada en salida la reemplazamos
            if (fechaEncontrada < fechaCama) {
                salida[indiceEncontrado] = unaCama;
            }
        } else {
            // si no se encontro agregamos la cama a la salida
            salida.push(unaCama);
        }
    });
    return salida;
}

export function censoDiario(unidad, fechaConsulta, idOrganizacion) {
    return new Promise((resolve, reject) => {
        const fecha = fechaConsulta;
        let listadoCensos = [];
        camasController.camaOcupadasxUO(unidad, fecha, idOrganizacion).then(
            camas => {
                if (camas) {
                    // filtramos aquellos movimientos que fueron dentro de una misma unidad organizativa
                    // y nos quedamos con el ultimo
                    let camasFiltradas = this.filtrarMovimientosIntraUO(camas);
                    let salidaCamas = Promise.all(camasFiltradas.map(c => camasController.desocupadaEnDia(c, fecha)));

                    salidaCamas.then(salida => {
                        let filtroNulos = salida.filter(s => s);
                        let pasesDeCama = Promise.all(filtroNulos.map(c => internacionesController.PasesParaCenso(c)));
                        pasesDeCama.then(resultado => {
                            if (resultado.length) {
                                let pasesCamaCenso: any[] = resultado;
                                // loopeamos todos los pases de las camas
                                pasesCamaCenso.map((censo: any, indice) => {
                                    censo.pases = censo.pases.filter(p => { return p.estados.fecha <= moment(fecha).endOf('day').toDate(); });
                                    // Llamamos a la funcion completarUnCenso que se encarga de devolvernos un array
                                    // con la informacion que necesitamos para el censo. (ingreso, pase de, pase a, etc)
                                    let result = completarUnCenso(censo, indice, fecha, unidad, pasesCamaCenso[indice]);
                                    let index = -2;
                                    if (result['esIngreso'] && result['esPaseDe']) {
                                        index = censo.pases.findIndex(p => p.estados._id === result['esPaseDe']._id);
                                    }
                                    if (!result['esIngreso'] && result['esPaseA'] && result['esPaseDe']) {
                                        if (result['esPaseA'].fecha <= result['esPaseDe'].fecha) {
                                            index = censo.pases.findIndex(p => p.estados._id === result['esPaseA']._id);
                                        }
                                    }
                                    let registros = censo.internacion.ejecucion.registros;
                                    let egresoExiste = registros.find(registro => registro.concepto.conceptId === '58000006');
                                    let fechaActual = new Date(fechaConsulta);

                                    if (egresoExiste && moment(fechaActual).endOf('day') <= moment(new Date(egresoExiste.valor.InformeEgreso.fechaEgreso)).endOf('day')) {

                                        if (index >= 0) {
                                            let pases1 = censo.pases.slice(0, (index + 1));
                                            let pases2 = censo.pases.slice(index, censo.pases.length);

                                            censo.pases = pases1;
                                            let nuevoCenso = { ...censo };
                                            nuevoCenso.pases = pases2;
                                            let censo1 = completarUnCenso(censo, indice, fecha, unidad, pasesCamaCenso[indice]);
                                            listadoCensos.push({ censo: censo1, fecha });
                                            let censo2 = completarUnCenso(nuevoCenso, indice, fecha, unidad, pasesCamaCenso[indice]);
                                            listadoCensos.push({ censo: censo2, fecha });

                                        } else {

                                            listadoCensos.push({ censo: result, fecha });
                                        }
                                    } else {
                                        if (index >= 0) {
                                            let pases1 = censo.pases.slice(0, (index + 1));
                                            let pases2 = censo.pases.slice(index, censo.pases.length);
                                            censo.pases = pases1;
                                            let nuevoCenso = { ...censo };
                                            nuevoCenso.pases = pases2;
                                            let censo1 = completarUnCenso(censo, indice, fecha, unidad, pasesCamaCenso[indice]);
                                            listadoCensos.push({ censo: censo1, fecha });
                                            let censo2 = completarUnCenso(nuevoCenso, indice, fecha, unidad, pasesCamaCenso[indice]);
                                            listadoCensos.push({ censo: censo2, fecha });
                                        } else {
                                            listadoCensos.push({ censo: result, fecha });
                                        }
                                    }
                                });
                            } else {
                                listadoCensos.push({ censo: null, fecha });
                            }
                            return resolve(listadoCensos);
                        }).catch(error => {
                            return reject(error);
                        });
                    });
                } else {
                    return null;
                }
            }).catch(err => {
                return reject(err);
            });
    });
}

export function completarResumenDiario(listadoCenso, unidad, fecha, idOrganizacion) {
    return new Promise((resolve, reject) => {
        let resumenCenso = {
            existencia0: 0,
            ingresos: 0,
            pasesDe: 0,
            egresosAlta: 0,
            egresosDefuncion: 0,
            pasesA: 0,
            existencia24: 0,
            ingresoEgresoDia: 0,
            pacientesDia: 0,
            disponibles24: 0,
            disponibles0: 0
        };
        if (listadoCenso && listadoCenso.length > 0) {
            Object.keys(listadoCenso).forEach(indice => {
                if (listadoCenso[indice].censo !== null) {

                    // resumenCenso.disponibles24 += 1;
                    resumenCenso.existencia24 += 1;
                    if (listadoCenso[indice].censo['esIngreso']) {
                        resumenCenso.ingresos += 1;
                    }
                    if (listadoCenso[indice].censo['esIngreso'] && listadoCenso[indice].censo['esPaseDe']) {
                        resumenCenso.existencia0 += 1;
                    }

                    if (listadoCenso[indice].censo['esPaseDe']) {
                        resumenCenso.pasesDe += 1;
                    }

                    if (listadoCenso[indice].censo['esPaseA']) {
                        resumenCenso.pasesA += 1;
                    }

                    if (listadoCenso[indice].censo['egreso'] !== '') {
                        if (listadoCenso[indice].censo['egreso'] === 'Defunción') {
                            resumenCenso.egresosDefuncion += 1;
                        } else {
                            resumenCenso.egresosAlta += 1;
                        }
                        if (listadoCenso[indice].censo['esIngreso']) {
                            resumenCenso.ingresoEgresoDia += 1;
                        }
                    }
                }
            });
            resumenCenso.pacientesDia = resumenCenso.existencia0 +
                resumenCenso.ingresos + resumenCenso.pasesDe -
                resumenCenso.egresosDefuncion - resumenCenso.egresosAlta;
            if (resumenCenso.pacientesDia < 0) {
                resumenCenso.pacientesDia = 0;
            }
            resumenCenso.existencia24 = resumenCenso.existencia24 -
                resumenCenso.egresosDefuncion - resumenCenso.egresosAlta - resumenCenso.pasesA;
            resumenCenso.existencia0 = resumenCenso.existencia24 +
                resumenCenso.egresosDefuncion + resumenCenso.egresosAlta + resumenCenso.pasesA
                - resumenCenso.ingresos - resumenCenso.pasesDe;
        }
        camasController.disponibilidadXUO(unidad, fecha, idOrganizacion).then((respuesta: any) => {
            if (respuesta) {
                resumenCenso.disponibles0 = respuesta.disponibilidad0 ? respuesta.disponibilidad0 : 0;
                resumenCenso.disponibles24 = respuesta.disponibilidad24 ? respuesta.disponibilidad24 : 0;
            }
            return resolve(resumenCenso);
        }).catch(err => {
            return reject(err);
        });
    });
}

export function censoMensual(fechaDesde, fechaHasta, unidad, idOrganizacion) {
    return new Promise(async (resolve, reject) => {
        let censoMensualTotal = [];
        let nuevaFechaDesde = new Date(fechaDesde);
        let nuevaFechaHasta = new Date(fechaHasta);
        let promises = [];
        let algo = 0;
        while (nuevaFechaDesde <= nuevaFechaHasta) {
            let censo = await censoDiario(unidad, new Date(nuevaFechaDesde), idOrganizacion);
            promises.push(censo);
            let nuevoDia = nuevaFechaDesde.getDate() + 1;
            nuevaFechaDesde.setDate(nuevoDia);
        }
        Promise.all(promises).then(async censosDiarios => {
            for (let unCenso of censosDiarios) {
                if (unCenso.length > 0) {
                    let resumen = await censoController.completarResumenDiario(unCenso, unidad, unCenso[0].fecha, idOrganizacion);
                    let resultadoFinal = {
                        fecha: unCenso[0].fecha,
                        resumen
                    };
                    censoMensualTotal.push(resultadoFinal);
                }
            }
            return resolve(censoMensualTotal);
        });
    });
}

export function completarUnCenso(censo, indice, fecha, idUnidadOrganizativa, CamaCenso) {
    let internacion = CamaCenso.internacion;
    let ingresoEgreso = [];
    ingresoEgreso[indice] = {};
    ingresoEgreso[indice]['dataCenso'] = CamaCenso;
    ingresoEgreso[indice]['egreso'] = comprobarEgreso(internacion, censo.pases, fecha, idUnidadOrganizativa);
    ingresoEgreso[indice]['esIngreso'] = esIngreso(censo.pases, fecha, idUnidadOrganizativa);
    ingresoEgreso[indice]['esPaseDe'] = esPaseDe(censo.pases, fecha, idUnidadOrganizativa);
    ingresoEgreso[indice]['esPaseA'] = esPaseA(censo.pases, fecha, idUnidadOrganizativa);
    return ingresoEgreso[indice];
}

function esIngreso(pases, fecha, idUnidadOrganizativa) {
    if (pases && pases.length >= 1) {
        let fechaInicio = moment(fecha).startOf('day').toDate();
        let fechaFin = moment(fecha).endOf('day').toDate();
        if (pases[0].estados.fecha >= fechaInicio && pases[0].estados.fecha <= fechaFin) {
            if (pases[0].estados.unidadOrganizativa.conceptId === idUnidadOrganizativa) {

                return true;
            } else { return false; }
        } else { return false; }
    } else { return false; }
}

function esPaseDe(pases, fecha, idUnidadOrganizativa) {
    if (pases && pases.length > 1) {
        let fechaInicio = moment(fecha).startOf('day').toDate();
        let fechaFin = moment(fecha).endOf('day').toDate();

        // buscamos el ultimo pase de la UO que estamos filtrando
        let ultimoIndice = -1;
        pases.forEach((p, i) => {
            if (p.estados.unidadOrganizativa.conceptId === idUnidadOrganizativa) {
                ultimoIndice = i;
            }
        });
        let ultimoPase = pases[ultimoIndice];
        let paseAnterior = pases[ultimoIndice - 1];
        if (ultimoPase.estados.fecha >= fechaInicio && ultimoPase.estados.fecha <= fechaFin) {
            if (paseAnterior && paseAnterior.estados.unidadOrganizativa.conceptId !== idUnidadOrganizativa) {
                return paseAnterior.estados;
            }
        }
    }
    return null;
}

function esPaseA(pases, fecha, idUnidadOrganizativa) {
    if (pases && pases.length > 1) {
        let fechaInicio = moment(fecha).startOf('day').toDate();
        let fechaFin = moment(fecha).endOf('day').toDate();
        let ultimoPase = pases[pases.length - 1];
        let paseAnterior = pases[pases.length - 2];
        if (ultimoPase.estados.fecha >= fechaInicio && ultimoPase.estados.fecha <= fechaFin) {
            if (paseAnterior.estados.unidadOrganizativa.conceptId === idUnidadOrganizativa &&
                ultimoPase.estados.unidadOrganizativa.conceptId !== idUnidadOrganizativa) {
                return ultimoPase.estados;
            } else {
                let paseAux = pases[pases.length - 3];
                if (paseAux && ultimoPase.estados.unidadOrganizativa.conceptId === idUnidadOrganizativa && paseAux.estados.unidadOrganizativa.conceptId === idUnidadOrganizativa) {
                    if (paseAnterior.estados.unidadOrganizativa.conceptId !== idUnidadOrganizativa) {
                        return paseAnterior.estados;
                    }

                }
            }
        }
    }
    return null;
}

function comprobarEgreso(internacion, pases, fecha, idUnidadOrganizativa) {
    let fechaInicio = moment(fecha).startOf('day').toDate();
    let fechaFin = moment(fecha).endOf('day').toDate();
    let registros = internacion.ejecucion.registros;
    let egresoExiste = registros.find(registro => registro.concepto.conceptId === '58000006');

    if (egresoExiste) {

        if (egresoExiste.valor.InformeEgreso.fechaEgreso && egresoExiste.valor.InformeEgreso.tipoEgreso && new Date(egresoExiste.valor.InformeEgreso.fechaEgreso) >= fechaInicio && new Date(egresoExiste.valor.InformeEgreso.fechaEgreso) <= fechaFin) {
            if (pases[pases.length - 1].estados.unidadOrganizativa.conceptId === idUnidadOrganizativa) {
                return egresoExiste.valor.InformeEgreso.tipoEgreso.nombre;
            }
        }

    }
    return '';
}
