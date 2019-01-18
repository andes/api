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
    let datosReportables = await getDatosReportables(prestacion.solicitud.tipoPrestacion.conceptId);
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

function getDatosReportables(idTipoPrestacion: any) {
    return new Promise(async (resolve, reject) => {
        let configAuto: any = await getConfiguracionAutomatica(idTipoPrestacion);
        console.log("Config Automatica: ", configAuto);

        if ((configAuto) && (configAuto.nomencladorSUMAR.datosReportables.length > 0)) {
            console.log("Entrarrrrr");
            let conceptos: any = [];


            let querySnomed = makeMongoQuery('<<2261000013100');
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
                console.log("Conceptos: ", conceptos);

                // ejecutamos busqueda recursiva
                // let data: any = buscarEnHudsFacturacion(prestaciones, conceptos);

                // console.log('hola', data);
                // if (data) {
                //      data2 = matchConcepts(data[0].registro, conceptos);
                // }

                // res.json(data);
            });

            resolve(querySnomed);
        }
    });
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
