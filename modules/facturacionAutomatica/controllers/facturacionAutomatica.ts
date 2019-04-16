import { Organizacion } from './../../../core/tm/schemas/organizacion';
import { Puco } from './../../obraSocial/schemas/puco';
import { ObraSocial } from './../../obraSocial/schemas/obraSocial';
import { profesional } from './../../../core/tm/schemas/profesional';
import { makeMongoQuery } from '../../../core/term/controller/grammar/parser';
import { SnomedModel } from '../../../core/term/schemas/snomed';
import * as configAutomatica from './../schemas/configFacturacionAutomatica';

export async function facturacionAutomatica(prestacion: any) {
    let idOrganizacion = (prestacion.ejecucion) ? prestacion.ejecucion.organizacion.id : prestacion.organizacion._id;
    let datosOrganizacion: any = await Organizacion.findById(idOrganizacion);
    let obraSocialPaciente = await getObraSocial(prestacion.paciente.documento);

    let getDR = await getDatosReportables(prestacion);

    const factura = {
        turno: {
            _id: (prestacion.solicitud) ? prestacion.solicitud.turno : prestacion.id,
        },
        paciente: {
            nombre: prestacion.paciente.nombre,
            apellido: prestacion.paciente.apellido,
            dni: prestacion.paciente.documento,
            fechaNacimiento: prestacion.paciente.fechaNacimiento,
            sexo: prestacion.paciente.sexo
        },
        prestacion: {
            conceptId: (prestacion.solicitud) ? prestacion.solicitud.tipoPrestacion.conceptId : prestacion.tipoPrestacion.conceptId,
            term: (prestacion.solicitud) ? prestacion.solicitud.tipoPrestacion.term : prestacion.tipoPrestacion.term,
            fsn: (prestacion.solicitud) ? prestacion.solicitud.tipoPrestacion.fsn : prestacion.tipoPrestacion.fsn,
            datosReportables: getDR,
        },
        organizacion: {
            nombre: (prestacion.ejecucion) ? prestacion.ejecucion.organizacion.nombre : prestacion.organizacion.nombre,
            cuie: datosOrganizacion.codigo.cuie,
            idSips: datosOrganizacion.codigo.sips
        },
        obraSocial: (obraSocialPaciente) ? {
            codigoFinanciador: obraSocialPaciente[0].codigoPuco,
            financiador: obraSocialPaciente[0].nombre
        } : null,
        profesional: {
            nombre: (prestacion.solicitud) ? prestacion.solicitud.profesional.nombre : prestacion.profesionales[0].nombre,
            apellido: (prestacion.solicitud) ? prestacion.solicitud.profesional.apellido : prestacion.profesionales[0].apellido,
            dni: (prestacion.solicitud) ? prestacion.solicitud.profesional.documento : await getProfesional(prestacion.profesionales[0]._id) // prestacion.profesionales[0].documento,
        }
    };

    return factura;

}

function getConfiguracionAutomatica(conceptId: any) {
    return configAutomatica.find({}).where('prestacionSnomed.conceptId').equals(conceptId);
}

async function getDatosReportables(prestacion: any) {
    if (prestacion.solicitud) {
        let idTipoPrestacion = prestacion.solicitud.tipoPrestacion.conceptId;
        let configAuto: any = await getConfiguracionAutomatica(idTipoPrestacion);

        if ((configAuto) && (configAuto.sumar.datosReportables.length > 0)) {
            let conceptos: any = [];
            const expresionesDR = configAuto.sumar.datosReportables.map((config: any) => config.valores);

            let promises = expresionesDR.map(async (exp, index) => {
                // return new Promise(async (resolve, reject) => {
                let querySnomed = makeMongoQuery(exp[0].expresion);
                let docs = await SnomedModel.find(querySnomed, { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 }).sort({ fullySpecifiedName: 1 });

                conceptos = docs.map((item: any) => {
                    let termSnomed = item.fullySpecifiedName.substring(0, item.fullySpecifiedName.indexOf('(') - 1);
                    return {
                        fsn: item.fullySpecifiedName,
                        term: termSnomed,
                        conceptId: item.conceptId,
                        semanticTag: item.semtag
                    };
                });

                // ejecutamos busqueda recursiva
                let data: any = await buscarEnHudsFacturacion(prestacion, conceptos);

                if (data.length > 0) {
                    let datoReportable = data;
                    // let datoReportable = {
                    //     conceptId: data[0].registro.concepto.conceptId,
                    //     term: data[0].registro.concepto.term,
                    //     valor: (data[0].registro.valor.concepto) ? {
                    //         conceptId: (data[0].registro.valor.concepto) ? data[0].registro.valor.concepto.conceptId : data[0].registro.valor,
                    //         nombre: (data[0].registro.valor.concepto) ? data[0].registro.valor.concepto.term : data[0].registro.concepto.term
                    //     } : data[0].registro.valor
                    // };

                    // resolve(datoReportable);
                } else {
                    // resolve();
                }

                // resolve();
                // });
            });

            return await Promise.all(promises);
        }
    }
    return '';
}

function buscarEnHudsFacturacion(prestacion, conceptos) {
    return new Promise(async (resolve, reject) => {
        let data = [];

        prestacion.ejecucion.registros.forEach(async registro => {
            // verificamos si el registro de la prestacion tiene alguno de
            // los conceptos en su array de registros
            let resultado = await matchConceptsFacturacion(registro, conceptos);

            if (resultado) {
                // agregamos el resultado a a devolver
                data.push({
                    registro: resultado
                });
            }
        });
        resolve(data);
    });
}

export function matchConceptsFacturacion(registro, conceptos) {
    // almacenamos la variable de matcheo para devolver el resultado
    let match = false;

    // Si no es un array entra
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

function getProfesional(idProfesional: any) {
    return new Promise(async (resolve, reject) => {
        let prof: any = await profesional.findById(idProfesional).exec();

        resolve(prof.documento);
    });
}
