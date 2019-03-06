
import * as moment from 'moment';
import * as camasController from './../controllers/cama';
import * as internacionesController from './../controllers/internacion';
import * as censoController from './../controllers/censo';
import * as mongoose from 'mongoose';

import * as cama from './../schemas/camas';
import { Organizacion } from './../../../core/tm/schemas/organizacion';
import { toArray } from '../../../utils/utils';
import * as censo from './../schemas/censo';

export function filtrarMovimientosIntraUO(camas) {
    let salida = [];
    camas.forEach(unaCama => {
        // buscamos si en la salida ya existe una cama ocupada con la misma internacion en la misma unidad organizativa
        let indiceEncontrado = salida.findIndex(c => (c.ultimoEstado.unidadOrganizativa.conceptId === unaCama.ultimoEstado.unidadOrganizativa.conceptId) && (c.ultimoEstado.idInternacion.toString() === unaCama.ultimoEstado.idInternacion.toString()));
        if (indiceEncontrado >= 0) {
            // buscamos entre los pases el movimeinto encontrado para comprobar si se trata de un movimiento de cama
            // (dentro de la misma unidad organizativa) o esta volviendo a la unidad organizativa de origen luego de un pase
            const indicePase = unaCama.pases.findIndex(pase =>
                pase.estados._id.toString() === unaCama.ultimoEstado._id.toString());
            if (indicePase > 0) {
                // Obtenemos el pase anterior para verificar si es otra unidad organizativa o no
                const movimientoActual = unaCama.pases[indicePase];
                const paseAnterior = unaCama.pases[indicePase - 1];
                if (paseAnterior.estados.unidadOrganizativa.conceptId === movimientoActual.estados.unidadOrganizativa.conceptId) {
                    // Si existe vamos a coparar las fechas para quedarnos con la ultima ocupada
                    let fechaEncontrada = new Date(paseAnterior.estados.fecha);
                    let fechaCama = new Date(movimientoActual.estados.fecha);
                    // Solo si la fecha de la cama actual es posterior a la ya almacenada en salida la reemplazamos
                    if (fechaEncontrada < fechaCama) {
                        salida[indiceEncontrado] = unaCama;
                    }
                } else {
                    // si no se encontro agregamos la cama a la salida
                    salida.push(unaCama);
                }
            } else {
                // si no se encontro agregamos la cama a la salida
                salida.push(unaCama);
            }

        } else {
            // si no se encontro agregamos la cama a la salida
            salida.push(unaCama);
        }
    });
    return salida;
}

export async function censoDiario(unidad, fechaConsulta, idOrganizacion) {
    try {

        const fecha = fechaConsulta;
        let listadoCensos = [];
        let camas = await camasController.camaOcupadasxUO(unidad, fecha, idOrganizacion);
        if (camas) {
            let salida = await Promise.all(camas.map(c => camasController.desocupadaEnDia(c, fecha)));
            let filtroNulos = salida.filter(s => s);
            let resultado = await Promise.all(filtroNulos.map(c => internacionesController.PasesParaCenso(c)));
            if (resultado.length) {
                // filtramos aquellos movimientos que fueron dentro de una misma unidad organizativa
                // y nos quedamos con el ultimo
                let pasesCamaCenso: any[] = filtrarMovimientosIntraUO(resultado);
                // loopeamos todos los pases de las camas
                pasesCamaCenso.map((unCenso: any, indice) => {
                    unCenso.pases = unCenso.pases.filter(p => { return p.estados.fecha <= moment(fecha).endOf('day').toDate(); });
                    // Llamamos a la funcion completarUnCenso que se encarga de devolvernos un array
                    // con la informacion que necesitamos para el censo. (ingreso, pase de, pase a, etc)
                    let result = completarUnCenso(unCenso, indice, fecha, unidad, pasesCamaCenso[indice]);
                    listadoCensos.push({ censo: result, fecha });
                });
            } else {
                listadoCensos.push({ censo: null, fecha });
            }
            return await listadoCensos;
        } else {
            return null;
        }
    } catch (err) {
        return err;
    }
}

export async function completarResumenDiario(listadoCenso, unidad, fecha, idOrganizacion) {
    try {
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
            disponibles24: 0
            //            disponibles0: 0
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

                    }
                    if ((listadoCenso[indice].censo['esIngreso'] || listadoCenso[indice].censo['esPaseDe']) &&
                        (listadoCenso[indice].censo['egreso'] !== '' || listadoCenso[indice].censo['esPaseA'])) {
                        resumenCenso.ingresoEgresoDia += 1;
                    }
                }
            });
            resumenCenso.existencia24 = resumenCenso.existencia24 -
                resumenCenso.egresosDefuncion - resumenCenso.egresosAlta - resumenCenso.pasesA;
            resumenCenso.existencia0 = resumenCenso.existencia24 +
                resumenCenso.egresosDefuncion + resumenCenso.egresosAlta + resumenCenso.pasesA
                - resumenCenso.ingresos - resumenCenso.pasesDe;
            resumenCenso.pacientesDia = resumenCenso.existencia24 + resumenCenso.ingresoEgresoDia;
            //  resumenCenso.existencia0 +
            //     resumenCenso.ingresos + resumenCenso.pasesDe -
            //     resumenCenso.egresosDefuncion - resumenCenso.egresosAlta;
            // if (resumenCenso.pacientesDia < 0) {
            //     resumenCenso.pacientesDia = 0;
            // }

        }
        let respuesta: any = await camasController.disponibilidadCenso(unidad, fecha, idOrganizacion);
        resumenCenso.disponibles24 = respuesta ? respuesta.length : 0;

        return await resumenCenso;
    } catch (err) {
        return err;
    }
}
export async function censoMensual(fechaDesde, fechaHasta, unidad, organizacionID) {
    let pipelineEstado = [];
    pipelineEstado = [{
        $match: {
            $and: [
                { 'censos.fecha': { $gte: fechaDesde } },
                { 'censos.fecha': { $lte: fechaHasta } },
                { idOrganizacion: organizacionID },
                { 'unidadOrganizativa.conceptId': unidad }
            ]
        }
    },
    { $unwind: '$censos' },
    {
        $project: {
            fecha: '$censos.fecha',
            censo: '$censos.censo'
        }
    }, {
        $match: {
            $and: [
                { fecha: { $gte: fechaDesde } },
                { fecha: { $lte: fechaHasta } },

            ]
        }
    },
    ];
    let data = await toArray(censo.model.aggregate(pipelineEstado).cursor({}).exec());
    if (data && data.length > 0) {
        return data;
    } else {
        return null;
    }
}

export async function censoMensualJob(done) {

    // traigo listado de organizaciones desde el listado de cama
    const data2 = await toArray(cama.model.aggregate([
        { $group: { _id: '$organizacion._id' } }
    ]).cursor({}).exec());
    for (let indexI = 0; indexI < data2.length; indexI++) {
        const organizaciones = data2[indexI];
        // obtengo el obj completo de cada organizacion por id
        const org: any = await Organizacion.find(organizaciones._id);
        let unidadesOrg = org[0].unidadesOrganizativas;
        let idOrganizacion = mongoose.Types.ObjectId(organizaciones._id);
        // loop por cada unidad organizativa de cada organizacion
        for (let index = 0; index < unidadesOrg.length; index++) {
            const uOrg = unidadesOrg[index];
            let fechaDesde = moment(new Date().setMonth(new Date().getMonth() - 6)).endOf('day').toDate();

            await censoController.censoMensual(fechaDesde, moment(new Date()).endOf('day'), uOrg.conceptId, idOrganizacion).then(async (result: any) => {
                // consulto si ya existe un censo para esa unidad organizativa y esa organizacion
                let existeCenso: any = await censo.model.find({ 'unidadOrganizativa.conceptId': uOrg.conceptId, idOrganizacion: organizaciones._id });
                if (existeCenso.length > 0) {
                    for (let indexE = 0; indexE < result.length; indexE++) {
                        const element = result[indexE];

                        // busco el index del censo que coincida con la fecha para despues pisar el mismo con el nuevo valor generado del censo
                        let indexCenso = existeCenso[0].censos.findIndex(x => { return new Date(x.fecha).toString() === new Date(element.fecha).toString(); });

                        // si es encontrado el valor piso el resultado
                        if (indexCenso >= 0) {

                            existeCenso[0].censos[indexCenso].censo = element.resumen;

                        } else {
                            // si no se encontro se va a pushear el nuevo dia

                            existeCenso[0].censos.push({
                                fecha: element.fecha,
                                censo: element.resumen
                            });

                        }

                    }
                    await existeCenso[0].save();
                } else {
                    let censoObj = [];
                    for (let indexJ = 0; index < result.length; index++) {
                        const element = result[indexJ];
                        censoObj.push({
                            fecha: element.fecha,
                            censo: element.resumen
                        });
                    }

                    let obj = {
                        unidadOrganizativa: uOrg,
                        idOrganizacion: organizaciones._id,
                        censos: censoObj
                    };
                    // censoMensual.push(obj);
                    const Censo = new censo.model(obj);
                    await Censo.save();

                }

            });
        }

    }

    done();
}

export function completarUnCenso(unCenso, indice, fecha, idUnidadOrganizativa, CamaCenso) {
    let internacion = CamaCenso.internacion;
    let ingresoEgreso = [];
    ingresoEgreso[indice] = {};
    ingresoEgreso[indice]['dataCenso'] = CamaCenso;
    ingresoEgreso[indice]['egreso'] = comprobarEgreso(internacion, CamaCenso.ultimoEstado, unCenso.pases, fecha, idUnidadOrganizativa);
    ingresoEgreso[indice]['esIngreso'] = esIngreso(unCenso.pases, CamaCenso.ultimoEstado, fecha, idUnidadOrganizativa);
    ingresoEgreso[indice]['esPaseDe'] = esPaseDe(unCenso.pases, CamaCenso.ultimoEstado, fecha, idUnidadOrganizativa);
    ingresoEgreso[indice]['esPaseA'] = esPaseA(unCenso.pases, CamaCenso.ultimoEstado, fecha, idUnidadOrganizativa);
    return ingresoEgreso[indice];
}

function esIngreso(pases, movimientoActual, fecha, idUnidadOrganizativa) {
    let ultimoIndice = -1;
    let bandera = true;
    if (pases && pases.length >= 1) {
        let fechaInicio = moment(fecha).startOf('day').toDate();
        let fechaFin = moment(fecha).endOf('day').toDate();
        for (const p of pases) {
            if (bandera && p.estados.unidadOrganizativa.conceptId === movimientoActual.unidadOrganizativa.conceptId) {
                ultimoIndice = ultimoIndice + 1;
            } else {
                bandera = false;
            }
        }
        if (pases[0].estados.fecha >= fechaInicio && pases[0].estados.fecha <= fechaFin) {
            if (pases[0].estados.unidadOrganizativa.conceptId === idUnidadOrganizativa) {
                if (pases[ultimoIndice].estados._id.toString() === movimientoActual._id.toString()) {
                    return true;
                } else {
                    return false;
                }
            } else { return false; }
        } else { return false; }
    } else { return false; }
}

function esPaseDe(pases, movimientoActual, fecha, idUnidadOrganizativa) {
    if (pases && pases.length > 1) {
        let fechaInicio = moment(fecha).startOf('day').toDate();
        let fechaFin = moment(fecha).endOf('day').toDate();

        // buscamos el ultimo pase de la UO que estamos filtrando
        let ultimoIndice = pases.findIndex(p => p.estados._id.toString() === movimientoActual._id.toString());
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

function esPaseA(pases, movimientoActual, fecha, idUnidadOrganizativa) {
    if (pases && pases.length > 1) {
        let fechaInicio = moment(fecha).startOf('day').toDate();
        let fechaFin = moment(fecha).endOf('day').toDate();

        // buscamos el ultimo pase de la UO que estamos filtrando
        let ultimoIndice = pases.findIndex(p => p.estados._id.toString() === movimientoActual._id.toString());
        if (ultimoIndice >= 0 && ultimoIndice < (pases.length - 1)) {
            let ultimoPase = pases[ultimoIndice];
            let paseSiguiente = pases[ultimoIndice + 1];
            if (paseSiguiente && ultimoPase.estados.fecha <= fechaFin &&
                paseSiguiente.estados.fecha >= fechaInicio && paseSiguiente.estados.fecha <= fechaFin) {
                if (paseSiguiente && paseSiguiente.estados.unidadOrganizativa.conceptId !== idUnidadOrganizativa) {
                    return paseSiguiente.estados;
                }
            }
        }
        return null;
    }
}

function comprobarEgreso(internacion, movimientoActual, pases, fecha, idUnidadOrganizativa) {
    if (pases && pases.length >= 1) {
        let fechaInicio = moment(fecha).startOf('day').toDate();
        let fechaFin = moment(fecha).endOf('day').toDate();
        let registros = internacion.ejecucion.registros;
        let egresoExiste = registros.find(registro => registro.concepto.conceptId === '58000006');
        if (egresoExiste) {
            if (pases[pases.length - 1].estados._id.toString() === movimientoActual._id.toString() && egresoExiste.valor.InformeEgreso.fechaEgreso && egresoExiste.valor.InformeEgreso.tipoEgreso && new Date(egresoExiste.valor.InformeEgreso.fechaEgreso) >= fechaInicio && new Date(egresoExiste.valor.InformeEgreso.fechaEgreso) <= fechaFin) {
                if (pases[pases.length - 1].estados.unidadOrganizativa.conceptId === idUnidadOrganizativa) {
                    return egresoExiste.valor.InformeEgreso.tipoEgreso.nombre;
                }
            }
        }
    }
    return '';
}
