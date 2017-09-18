import * as moment from 'moment';
import { SnomedMapping } from '../schemas/mapping';


/**
 * Mapea un concepto de snomed a CIE10
 *
 * 248152002 -> Mujer
 * 248153007 -> Hombre
 * 445518008 -> Edad
 *
 * https://www.nlm.nih.gov/research/umls/mapping_projects/IMAGICImplementationGuide.pdf
 * https://github.com/andes/snomed-cie10
 *
 */

export class SnomedCIE10Mapping {
    private contexto: any[];
    private paciente: any;
    private edadYear;
    private edadDays;
    private sexo;
    constructor(paciente, contexto) {
        this.contexto = contexto || [];
        this.paciente = paciente;

        if (this.paciente && this.paciente.fechaNacimiento) {
            let birthDate = moment(this.paciente.fechaNacimiento, 'YYYY-MM-DD HH:mm:ss');
            let currentDate = moment();

            this.edadYear = currentDate.diff(birthDate, 'years');
            this.edadDays = currentDate.diff(birthDate, 'd');
        } else {
            this.edadDays = this.edadYear = null;
        }

        if (this.paciente && this.paciente.sexo) {
            this.sexo = this.paciente.sexo === 'femenino' ? 'f' : (this.paciente.sexo === 'masculino' ? 'm' : null);
        } else {
            this.sexo = null;
        }
    }

    public transform(conceptId) {
        return new Promise((resolve, reject) => {

            SnomedMapping.find({ conceptId: conceptId }).sort('mapGroup mapPriority').then((mapping) => {
                for (let i = 0; i < mapping.length; i++) {
                    let rules = mapping[i] as any;
                    let rule = rules.mapRule;

                    if (this.check(rule)) {
                        if (rules.mapTarget.length > 0) {
                            return resolve(rules.mapTarget);
                        }
                    }
                }
                resolve(null);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    private check(predicado) {
        if (predicado.length > 0) {
            if (typeof predicado[0] === 'boolean') {
                return true;
            } else {
                let result = true;
                for (let i = 0; i < predicado.length; i++) {
                    let r = predicado[i];
                    if (r.concept === '248152002') {
                        result = result && this.sexo === 'f';
                    } else if (r.concept === '248153007') {
                        result = result && (this.sexo === 'm');
                    } else if (r.concept === '445518008') {
                        if (this.edadYear || this.edadDays) {
                            let edad = r.value.unit === 'days' ? this.edadDays : this.edadYear;
                            let value = Number(r.value.number);

                            result = result && (r.value.op === '<' ? edad < value : edad >= value);
                        } else {
                            result = false;
                        }

                    } else {
                        result = result && (this.contexto.indexOf(r.concept) >= 0);
                    }

                }
                return result;
            }
        }
        return false;
    }

}
