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
}

export function getDiagnosticos(params) {
    let resultados = [];
    let promises = [];
    return new Promise(async (resolve, reject) => {
        // Se buscan las agendas que tengan turnos o sobreturnos codificados con algun diagnostico c2
        let pipeline = [];
        pipeline = [{
            $match: {
                $or: [
                    {
                        'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria': { $exists: true, $ne: {} },
                        'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria.c2': true
                    },
                    {
                        'sobreturnos.diagnostico.codificaciones.0.codificacionAuditoria': { $exists: true, $ne: {} },
                        'sobreturnos.diagnostico.codificaciones.0.codificacionAuditoria.c2': true
                    }
                ],
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
                }
            }
        }
        ];
        let data = await toArray(agendaModel.aggregate(pipeline).cursor({}).exec());
        data.forEach(elem => {
            if (elem._id != null) {
                // Se definen variables cuantificadoras
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
                let sumaLactante = 0;
                let sumaMeningitis = 0;
                let meningitisMenor1 = 0;
                let meningitis1 = 0;
                let meningitis24 = 0;
                let masculinoLactante = 0;
                let femeninoLactante = 0;
                let otroLactante = 0;
                let masculinoMeningitis = 0;
                let femeninoMeningitis = 0;
                let otroMeningitis = 0;
                promises.push(new Promise((resolve1, reject1) => {
                    agendaModel.find({
                        'horaInicio': { '$gte': new Date(params.horaInicio) },
                        'horaFin': { '$lte': new Date(params.horaFin) },
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
                        function sexoMeningitis(sexo) {
                            switch (sexo) {
                                case 'masculino':
                                    masculinoMeningitis++;
                                    break;
                                case 'femenino':
                                    femeninoMeningitis++;
                                    break;
                                case 'otro':
                                    otroMeningitis++;
                                    break;
                            }
                        }
                        function calcularContadores(edad, sexo) {
                            if (edad < 5) {
                                if (edad < 1) {
                                    if (elem.codigo === 'A05.1') { // BOTULISMO
                                        sumaLactante++;
                                        switch (sexo) {
                                            case 'masculino':
                                                masculinoLactante++;
                                                break;
                                            case 'femenino':
                                                femeninoLactante++;
                                                break;
                                            case 'otro':
                                                otroLactante++;
                                                break;
                                        }
                                    } else {
                                        if (elem.codigo === 'A17.0') {  // Meningitis Tuberculosa
                                            sumaMeningitis++;
                                            meningitisMenor1++;
                                            sexoMeningitis(sexo);
                                        } else {
                                            sumaMenor1++;
                                        }
                                    }
                                }
                                if (edad === 1) {
                                    if (elem.codigo === 'A17.0') {  // Meningitis Tuberculosa
                                        sumaMeningitis++;
                                        meningitis1++;
                                        sexoMeningitis(sexo);
                                    } else {
                                        suma1++;
                                    }
                                }
                                if (edad >= 2 && edad <= 4) {
                                    if (elem.codigo === 'A17.0') {  // Meningitis Tuberculosa
                                        sumaMeningitis++;
                                        meningitis24++;
                                        sexoMeningitis(sexo);
                                    } else {
                                        suma24++;
                                    }
                                }
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
                            let codigoExcepcion = (elem.codigo === 'A05.1' && edad < 1) || (elem.codigo === 'A17.0' && edad < 5);
                            if (!codigoExcepcion && sexo === 'masculino') {
                                sumaMasculino++;
                            }
                            if (!codigoExcepcion && sexo === 'femenino') {
                                sumaFemenino++;
                            }
                            if (!codigoExcepcion && sexo === 'otro') {
                                sumaOtro++;
                            }
                        }
                        if (!agenda || err) {
                            return reject1(err);
                        }
                        agenda.forEach((ag: any, index) => {
                            // Se recorren los turnos de la agenda actual
                            ag.bloques.forEach(bloque => {
                                bloque.turnos.forEach(turno => {
                                    let codigos = turno.diagnostico.codificaciones;
                                    codigos.forEach(function (codigo) {
                                        if (codigo.codificacionAuditoria && codigo.codificacionAuditoria.c2 === true) {
                                            if (elem.codigo === codigo.codificacionAuditoria.codigo) {
                                                let edad = getAge(turno.paciente.fechaNacimiento);
                                                let sexo = turno.paciente.sexo;
                                                calcularContadores(edad, sexo);
                                            }
                                        }
                                    });
                                });
                            });

                            // Se recorren los sobreturnos de la agenda actual
                            ag.sobreturnos.forEach(sobreturno => {
                                let codigos = sobreturno.diagnostico.codificaciones;
                                codigos.forEach(function (codigo) {
                                    if (codigo.codificacionAuditoria) {
                                        if (elem.codigo === codigo.codificacionAuditoria.codigo) {
                                            let edad = getAge(sobreturno.paciente.fechaNacimiento);
                                            let sexo = sobreturno.paciente.sexo;
                                            calcularContadores(edad, sexo);
                                        }
                                    }
                                });
                            });
                        });

                        let sumaTotal = sumaMenor1 + suma1 + suma24 + suma59 + suma1014 + suma1524 + suma2534 + suma3544 + suma4564 + sumaMayor65;

                        let r2 = {
                            codigo: elem['codigo'],
                            nombre: elem['_id'],
                            reporteC2: elem['reporteC2'],
                            sumaMenor1: sumaMenor1,
                            suma1: suma1,
                            suma24: suma24,
                            suma59: suma59,
                            suma1014: suma1014,
                            suma1524: suma1524,
                            suma2534: suma2534,
                            suma3544: suma3544,
                            suma4564: suma4564,
                            sumaMayor65: sumaMayor65,
                            sumaMasculino: sumaMasculino,
                            sumaFemenino: sumaFemenino,
                            sumaOtro: sumaOtro,
                            total: sumaTotal,
                        };
                        if (elem['codigo'] === 'A05.1') { // Botulismo
                            let sumaResto = suma1 + suma24 + suma59 + suma1014 + suma1524 + suma2534 + suma3544 + suma4564 + sumaMayor65;
                            if (sumaLactante > 0) {
                                let r1 = {
                                    codigo: elem['codigo'],
                                    nombre: elem['_id'],
                                    reporteC2: 'Botulismo del Lactante',
                                    sumaMenor1: sumaLactante,
                                    suma1: 0,
                                    suma24: 0,
                                    suma59: 0,
                                    suma1014: 0,
                                    suma1524: 0,
                                    suma2534: 0,
                                    suma3544: 0,
                                    suma4564: 0,
                                    sumaMayor65: 0,
                                    sumaMasculino: masculinoLactante,
                                    sumaFemenino: femeninoLactante,
                                    sumaOtro: otroLactante,
                                    total: sumaLactante,
                                };
                                resultados.push(r1);
                            }
                            if (sumaResto > 0) {
                                resultados.push(r2);
                            }
                        } else {
                            if (elem['codigo'] === 'A17.0') { // Meningitis Tuberculosa
                                let sumaResto = suma59 + suma1014 + suma1524 + suma2534 + suma3544 + suma4564 + sumaMayor65;
                                if (sumaMeningitis > 0) {
                                    let r1 = {
                                        codigo: elem['codigo'],
                                        nombre: elem['_id'],
                                        reporteC2: 'Meningitis tuberculosa en menores de 5 años',
                                        sumaMenor1: meningitisMenor1,
                                        suma1: meningitis1,
                                        suma24: meningitis24,
                                        suma59: 0,
                                        suma1014: 0,
                                        suma1524: 0,
                                        suma2534: 0,
                                        suma3544: 0,
                                        suma4564: 0,
                                        sumaMayor65: 0,
                                        sumaMasculino: masculinoMeningitis,
                                        sumaFemenino: femeninoMeningitis,
                                        sumaOtro: otroMeningitis,
                                        total: sumaMeningitis,
                                    };
                                    resultados.push(r1);
                                }
                                if (sumaResto > 0) {
                                    r2.reporteC2 = 'Tuberculosis';
                                    resultados.push(r2);
                                }
                            } else {
                                if (sumaTotal > 0) {
                                    resultados.push(r2);
                                }
                            }
                        }
                        resolve1();
                    });
                }));

            }
        });

        Promise.all(promises).then(() => {
            // console.log('resultados ', resultados);
            resolve(resultados);
        });
    });
}
