import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as agendaModel from '../schemas/agenda';
import { toArray } from '../../../utils/utils';

function getAge(dateString) {
    let today = new Date();
    let birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    let m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export function getDiagnosticos(params) {
    // Agregar sobreturnos en la parte del match y el unwind
    let resultados = [];
    let promises = [];
    return new Promise(async (resolve, reject) => {

        let pipeline = [];
        pipeline = [{
            $match: {
                $or: [{'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria': {
                    $exists: true, $ne: {}
                }},{'sobreturnos.diagnostico.codificaciones.0.codificacionAuditoria' : {$exists: true, $ne: {}}}],
                'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria.c2': true,
                'horaInicio': { '$gte': new Date(params.horaInicio) },
                'horaFin': { '$lte': new Date(params.horaFin) },
            }
        },
        {
            $unwind: '$bloques'
        },
        {
            $unwind: '$bloques.turnos'
        },
        {
            $unwind: '$bloques.turnos.diagnostico.codificaciones'
        },
        {
            $group: {
                _id: '$bloques.turnos.diagnostico.codificaciones.codificacionAuditoria.nombre',
                codigo: {
                    $first: '$bloques.turnos.diagnostico.codificaciones.codificacionAuditoria.codigo'
                },
                reporteC2: {
                    $first: '$bloques.turnos.diagnostico.codificaciones.codificacionAuditoria.reporteC2'
                },
                // total: {
                //     $sum: 1
                // }
            }
        }
        ];
        let data = await toArray(agendaModel.aggregate(pipeline).cursor({}).exec());
        data.forEach(elem => {
            if (elem._id != null) {
                let sumaMenor1 = 0;
                let suma1 = 0;
                let suma24 = 0;
                let suma59 = 0;
                let suma1014 = 0;
                let suma1524 = 0;
                let suma2534 = 0;
                let suma3544 = 0;
                let suma4564 = 0;
                let sumaMayor65 = 0;
                let sumaMasculino = 0;
                let sumaFemenino = 0;
                let sumaOtro = 0;
                // let sumaLactante = 0;
                promises.push(new Promise((resolve1, reject1) => {
                    agendaModel.find({
                        $or: [{
                            'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria.codigo': {
                                $eq: elem.codigo
                            }
                        }, {
                            'sobreturnos.diagnostico.codificaciones.0.codificacionAuditoria.codigo': {
                                $eq: elem.codigo
                            }
                        }]
                    }).exec((err, agenda) => {
                        if (!agenda || err) {
                            return reject1(err);
                        }

                        agenda.forEach((ag: any, index) => {
                            ag.bloques.forEach(bloque => {
                                bloque.turnos.forEach(turno => {
                                    let codigos = turno.diagnostico.codificaciones;
                                    codigos.forEach(function (codigo) {
                                        if (codigo.codificacionAuditoria) {
                                            if (elem.codigo === codigo.codificacionAuditoria.codigo) {
                                                let edad = getAge(turno.paciente.fechaNacimiento);
                                                let sexo = turno.paciente.sexo;
                                                if (edad < 1) {
                                                    sumaMenor1++;
                                                    // if (elem.codigo === 'A05.1'){
                                                    //     sumaLactante++;
                                                    // }
                                                }
                                                if (edad === 1) {
                                                    suma1++;
                                                }
                                                if (edad >= 2 && edad <= 4) {
                                                    suma24++;
                                                }
                                                if (edad >= 5 && edad <= 9) {
                                                    suma59++;
                                                }
                                                if (edad >= 10 && edad <= 14) {
                                                    suma1014++;
                                                }
                                                if (edad >= 15 && edad <= 24) {
                                                    suma1524++;
                                                }
                                                if (edad >= 25 && edad <= 34) {
                                                    suma2534++;
                                                }
                                                if (edad >= 35 && edad <= 44) {
                                                    suma3544++;
                                                }
                                                if (edad >= 45 && edad <= 64) {
                                                    suma4564++;
                                                }
                                                if (edad > 65) {
                                                    sumaMayor65++;
                                                }
                                                if (sexo === 'masculino') {
                                                    sumaMasculino++;
                                                }
                                                if (sexo === 'femenino') {
                                                    sumaFemenino++;
                                                }
                                                if (sexo === 'otro') {
                                                    sumaOtro++;
                                                }
                                            }
                                        }
                                    });
                                });
                            });

                            // Aca
                            ag.sobreturnos.forEach(sobreturno => {
                                let codigos = sobreturno.diagnostico.codificaciones;
                                codigos.forEach(function (codigo) {
                                    if (codigo.codificacionAuditoria) {
                                        if (elem.codigo === codigo.codificacionAuditoria.codigo) {
                                            let edad = getAge(sobreturno.paciente.fechaNacimiento);
                                            let sexo = sobreturno.paciente.sexo;
                                            if (edad < 1) {
                                                sumaMenor1++;
                                                // if (elem.codigo === 'A05.1'){
                                                //     sumaLactante++;
                                                // }
                                            }
                                            if (edad === 1) {
                                                suma1++;
                                            }
                                            if (edad >= 2 && edad <= 4) {
                                                suma24++;
                                            }
                                            if (edad >= 5 && edad <= 9) {
                                                suma59++;
                                            }
                                            if (edad >= 10 && edad <= 14) {
                                                suma1014++;
                                            }
                                            if (edad >= 15 && edad <= 24) {
                                                suma1524++;
                                            }
                                            if (edad >= 25 && edad <= 34) {
                                                suma2534++;
                                            }
                                            if (edad >= 35 && edad <= 44) {
                                                suma3544++;
                                            }
                                            if (edad >= 45 && edad <= 64) {
                                                suma4564++;
                                            }
                                            if (edad > 65) {
                                                sumaMayor65++;
                                            }
                                            if (sexo === 'masculino') {
                                                sumaMasculino++;
                                            }
                                            if (sexo === 'femenino') {
                                                sumaFemenino++;
                                            }
                                            if (sexo === 'otro') {
                                                sumaOtro++;
                                            }
                                        }
                                    }
                                });
                            });
                        });
                        elem['nombre'] = elem['_id'];
                        // console.log('elem ', elem);
                        let resultado = elem;
                        resultado['sumaMenor1'] = sumaMenor1;
                        resultado['suma1'] = suma1;
                        resultado['suma24'] = suma24;
                        resultado['suma59'] = suma59;
                        resultado['suma1014'] = suma1014;
                        resultado['suma1524'] = suma1524;
                        resultado['suma2534'] = suma2534;
                        resultado['suma3544'] = suma3544;
                        resultado['suma4564'] = suma4564;
                        resultado['sumaMayor65'] = sumaMayor65;
                        resultado['total'] = sumaMenor1+suma1+suma24+suma59+suma1014+suma1524+suma2534+suma3544+suma4564+sumaMayor65;
                        resultado['sumaMasculino'] = sumaMasculino;
                        resultado['sumaFemenino'] = sumaFemenino;
                        resultado['sumaOtro'] = sumaOtro;
                        // resultado['sumaLactante'] = sumaLactante;
                        resultados.push(resultado);
                        resolve1();
                    });
                }));

            }
        });

        Promise.all(promises).then(() => {
            console.log('resultados ', resultados);
            resolve(resultados);
        });
    });
}
