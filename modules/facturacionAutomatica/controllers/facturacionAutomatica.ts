import * as mongoose from 'mongoose';
import { schema as Factura } from './../schemas/factura';
import { model as organizacion } from './../../../core/tm/schemas/organizacion';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { Puco } from './../../obraSocial/schemas/puco';
import { ObraSocial } from './../../obraSocial/schemas/obraSocial';
import { makeMongoQuery } from '../../../core/term/controller/grammar/parser';
import { snomedModel } from '../../../core/term/schemas/snomed';
import * as configAutomatica from './../schemas/configFacturacionAutomatica';
import { json } from 'body-parser';
import { stringify } from 'querystring';
import { resolve } from 'path';

export async function facturacionAutomatica(prestacion: any) {
    let idOrganizacion = prestacion.ejecucion.organizacion.id;
    // console.log("Prestacion: ", prestacion);

    let datosOrganizacion: any = await getDatosOrganizacion(idOrganizacion);
    let obraSocialPaciente = await getObraSocial(prestacion.paciente.documento);
    /* Pasar un solo parámetro prestaciones */
    let datosReportables = await getDatosReportables(prestacion.solicitud.tipoPrestacion.conceptId, prestacion);
    console.log("Get Datos Reportablesss: ", datosReportables);
    // let datosReportables = await getDatosReportables(103750000);

    const factura = {
        turno: {
            _id: prestacion.solicitud.turno,
        },
        paciente: {
            nombre: prestacion.paciente.nombre,
            apellido: prestacion.paciente.apellido,
            dni: prestacion.paciente.documento,
            fechaNacimiento: prestacion.paciente.fechaNacimiento,
            sexo: prestacion.paciente.sexo
        },
        prestacion: {
            conceptId: prestacion.solicitud.tipoPrestacion.conceptId,
            term: prestacion.solicitud.tipoPrestacion.term,
            fsn: prestacion.solicitud.tipoPrestacion.fsn,
            datosReportables: [datosReportables],
        },
        organizacion: {
            nombre: prestacion.ejecucion.organizacion.nombre,
            cuie: datosOrganizacion.codigo.cuie,
            idSips: datosOrganizacion.codigo.sips
        },
        obraSocial: (obraSocialPaciente) ? {
            codigoFinanciador: obraSocialPaciente[0].codigoPuco,
            financiador: obraSocialPaciente[0].nombre
        } : null,
        profesional: {
            nombre: prestacion.solicitud.profesional.nombre,
            apellido: prestacion.solicitud.profesional.apellido,
            dni: prestacion.solicitud.profesional.documento,
        }
    }

    // console.log("Factura: ", JSON.stringify(factura));
}

function getConfiguracionAutomatica(conceptId: any) {
    return new Promise(async (resolve, reject) => {
        let query;
        query = configAutomatica.find({});
        query.where('snomed.conceptId').equals(conceptId);
        query.exec((err, data) => {
            if (err) {
                reject(err);
            }

            resolve(data[0] ? data[0] : null);
        });
    });
}

async function getDatosReportables(idTipoPrestacion: any, prestacion: any) {
    let configAuto: any = await getConfiguracionAutomatica(idTipoPrestacion);

    if ((configAuto) && (configAuto.nomencladorSUMAR.datosReportables.length > 0)) {
        let conceptos: any = [];

        const expresionesDR = configAuto.nomencladorSUMAR.datosReportables.map((config: any) => config.valores);
        console.log("Expresionesss: ", expresionesDR[0]);
        let promises = expresionesDR[0].map(async (exp, index) => {
            // for (let x = 0; x < expresionesDR[0].length; x++) { 
            return new Promise(async (resolve, reject) => {
                console.log("Expresion: ", exp.expresion);
                let querySnomed = makeMongoQuery(exp.expresion);
                let docs = await snomedModel.find(querySnomed, { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 }).sort({ fullySpecifiedName: 1 });

                conceptos = docs.map((item: any) => {
                    let term = item.fullySpecifiedName.substring(0, item.fullySpecifiedName.indexOf('(') - 1);
                    return {
                        fsn: item.fullySpecifiedName,
                        term: term,
                        conceptId: item.conceptId,
                        semanticTag: item.semtag
                    };
                });
                console.log("Conceptos: ", conceptos);
                // ejecutamos busqueda recursiva
                let data: any = await buscarEnHudsFacturacion(prestacion, conceptos);
                console.log("Data despues de buscar en HudsFacturacion:  ", JSON.stringify(data));

                if (data.length > 0) {
                    let datoReportable = {
                        conceptId: data[0].registro.concepto.conceptId,
                        term: data[0].registro.concepto.term,
                        valor: {
                            conceptId: (data[0].registro.valor.concepto) ? data[0].registro.valor.concepto.conceptId : data[0].registro.valor,
                            nombre: (data[0].registro.valor.concepto) ? data[0].registro.valor.concepto.term : data[0].registro.concepto.term
                        }
                    };
                    console.log("Dato Reportable: ", datoReportable);
                    resolve(datoReportable);
                    // return datoReportable;
                } else {
                    resolve();
                }
                // }
            });
        });

        return await Promise.all(promises);
    }
}

function buscarEnHudsFacturacion(prestacion, conceptos) {
    return new Promise(async (resolve, reject) => {
        let data = [];

        prestacion.ejecucion.registros.forEach(async registro => {
            // verificamos si el registro de la prestacion tiene alguno de
            // los conceptos en su array de registros
            let resultado = await matchConceptsFacturacion(registro, conceptos);
            console.log("Resultado: ", resultado);
            if (resultado) {
                // agregamos el resultado a a devolver
                data.push({
                    registro: resultado
                });
            }

        });
        console.log("Data deHuds facturacion: ", data);
        resolve(data);
    });
}

export function matchConceptsFacturacion(registro, conceptos) {
    // return new Promise(async (resolve, reject) => {
    // almacenamos la variable de matcheo para devolver el resultado
    let match = false;

    // Si no es un array entra
    if (!Array.isArray(registro['registros']) || registro['registros'].length <= 0) {
        // console.log("Entra al primer If ");
        // verificamos que el concepto coincida con alguno de los elementos enviados en los conceptos
        if (registro.concepto && registro.concepto.conceptId && conceptos.find(c => c.conceptId === registro.concepto.conceptId)) {
            match = registro;
            // resolve(match);
            // console.log("Matchhhh: ", match);
        }

    } else {
        // console.log("Entra al Segundo If");
        registro['registros'].forEach((reg: any) => {
            let encontrado = null;
            if (encontrado = matchConceptsFacturacion(reg, conceptos)) {
                match = encontrado;
                // resolve(match);
                // console.log("Matchhhh Concepto Facturacion: ", match);
            }
        });
    }
    // console.log("Match definitivo: ", match); 
    // resolve(match);
    return match;
    // });
}


function getDatosOrganizacion(idOrganizacion: any) {
    return new Promise((resolve, reject) => {
        organizacion.findById(idOrganizacion, (err, data) => {
            if (err) {
                reject(err);
            }

            resolve(data);
        });
    });
}

function getObraSocial(dni: any) {
    return new Promise(async (resolve, reject) => {
        let osPuco: any = await Puco.find({ dni: Number.parseInt(dni, 10) }).exec();

        if (osPuco.length > 0) {
            let obraSocial = await ObraSocial.find({ codigoPuco: osPuco[0].codigoOS }).exec();

            resolve(obraSocial);
        } else {
            resolve(null);
        }
    });
}
