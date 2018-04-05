import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as mongoose from 'mongoose';


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
                    return paseAnterior.estados;
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
        if (egresoExiste.valor.InformeEgreso.fechaEgreso && egresoExiste.valor.InformeEgreso.tipoEgreso) {
            if (pases[pases.length - 1].estados.unidadOrganizativa.conceptId === idUnidadOrganizativa) {
                return egresoExiste.valor.InformeEgreso.tipoEgreso.nombre;
            }
        }

    }
    return '';
}
