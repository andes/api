import * as mongoose from 'mongoose';
import { schema as Factura } from './../schemas/factura';
import { model as organizacion } from './../../../core/tm/schemas/organizacion';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { Puco } from './../../obraSocial/schemas/puco';
import { ObraSocial } from './../../obraSocial/schemas/obraSocial';
import { makeMongoQuery } from '../../../core/term/controller/grammar/parser';
import { snomedModel } from '../../../core/term/schemas/snomed';
import * as configAutomatica from './../schemas/configFacturacionAutomatica';

export async function facturacionAutomatica(prestacion: any) {
    let idOrganizacion = prestacion.ejecucion.organizacion.id;
    // console.log("Prestacion: ", prestacion);

    let datosOrganizacion: any = await getDatosOrganizacion(idOrganizacion);
    let obraSocialPaciente = await getObraSocial(prestacion.paciente.documento);
    /* Pasar un solo parámetro prestaciones */
    let datosReportables = await getDatosReportables(prestacion.solicitud.tipoPrestacion.conceptId, prestacion);
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
            datosReportables: [
                {
                    conceptId: '371580005',
                    term: 'evaluación de antecedentes',
                    valor: {
                        conceptId: '160245001',
                        nombre: 'sin problemas o incapacidad actual'
                    }
                },
                {
                    conceptId: '2111000013109',
                    term: 'otoemisión acústica de oído izquierdo',
                    valor: {
                        conceptId: '2261000013100',
                        nombre: 'otoemision acustica ausente'
                    }
                },
                {
                    conceptId: '2101000013106',
                    term: 'otoemisión acústica de oído derecho',
                    valor: {
                        conceptId: '2271000013107',
                        nombre: 'otoemisión acustica presente'
                    }
                }
            ],
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


    // console.log("Factura: ", factura);
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

function getDatosReportables(idTipoPrestacion: any, prestacion: any) {
    return new Promise(async (resolve, reject) => {
        let configAuto: any = await getConfiguracionAutomatica(idTipoPrestacion);

        if ((configAuto) && (configAuto.nomencladorSUMAR.datosReportables.length > 0)) {
            let conceptos: any = [];

            const expresionesDR = configAuto.nomencladorSUMAR.datosReportables[0].valores.map((config: any) => config);

            let datosReportables = [];

            for (let x = 0; x < expresionesDR.length; x++) {
                let querySnomed = makeMongoQuery(expresionesDR[x].expresion);
                snomedModel.find(querySnomed, { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 }).sort({ fullySpecifiedName: 1 }).then((docs: any[]) => {

                    conceptos = docs.map((item) => {
                        let term = item.fullySpecifiedName.substring(0, item.fullySpecifiedName.indexOf('(') - 1);
                        return {
                            fsn: item.fullySpecifiedName,
                            term: term,
                            conceptId: item.conceptId,
                            semanticTag: item.semtag
                        };
                    });
                    // console.log("Conceptos: ", conceptos);

                    // ejecutamos busqueda recursiva
                    let data: any = buscarEnHudsFacturacion(prestacion, conceptos);

                    if (data.length > 0) {
                        let datoReportable = {
                            conceptId: data[0].registro.concepto.conceptId,
                            term: data[0].registro.concepto.term,
                            valor: {
                                conceptId: data[0].registro.valor.concepto.conceptId,
                                nombre: data[0].registro.valor.concepto.term
                            }
                        };
                        console.log("Un Datooooo: ", datoReportable);
                        datosReportables.push(datoReportable);
                        
                    }
                });
            }
            console.log("Muchos datosss: ", datosReportables);
            // resolve(querySnomed);
        }
    });
}

function buscarEnHudsFacturacion(prestacion, conceptos) {

    let data = [];
    // recorremos prestaciones
    // prestaciones.forEach((prestacion: any) => {
    // recorremos los registros de cada prestacion
    prestacion.ejecucion.registros.forEach(registro => {

        // verificamos si el registro de la prestacion tiene alguno de
        // los conceptos en su array de registros
        let resultado = matchConceptsFacturacion(registro, conceptos);
        if (resultado) {
            // agregamos el resultado a a devolver
            data.push({
                // tipoPrestacion: prestacion.solicitud.tipoPrestacion,
                // fecha: registro.createdAt,
                // profesional: registro.createdBy,
                registro: resultado
            });
        }

    });
    // });

    return data;
}

export function matchConceptsFacturacion(registro, conceptos) {
    // almacenamos la variable de matcheo para devolver el resultado
    let match = false;

    if (!Array.isArray(registro['registros']) || registro['registros'].length <= 0) {
        // verificamos que el concepto coincida con alguno de los elementos enviados en los conceptos
        if (registro.concepto && registro.concepto.conceptId && conceptos.find(c => c.conceptId === registro.concepto.conceptId)) {
            match = registro;
        }

    } else {
        registro['registros'].forEach((reg: any) => {
            let encontrado = null;
            if (encontrado = matchConceptsFacturacion(reg, conceptos)) {
                match = encontrado;
            }
        });
    }
    return match;
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
