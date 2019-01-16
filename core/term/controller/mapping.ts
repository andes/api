import * as moment from 'moment';
import { SnomedMapping } from '../schemas/mapping';
import * as staticMapping from '../schemas/staticmapping';
import * as cie10 from './../../../core/term/schemas/cie10';

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
            const birthDate = moment(this.paciente.fechaNacimiento, 'YYYY-MM-DD HH:mm:ss');
            const currentDate = moment();

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

    /**
     * Concepto secundarios para refinar el mappeo
     * (Ver la documentación del Mapping)
     * @param {any} contexto
     * @memberof SnomedCIE10Mapping
     */

    public setContexto(contexto) {
        this.contexto = contexto;
    }

    /**
     * Datos del paciente
     *
     * @param {any} paciente
     * @memberof SnomedCIE10Mapping
     */

    public setPaciente(paciente) {
        this.paciente = paciente;
    }

    /**
     * Mappea un concepto de SNOMED a CIE10
     *
     * @param {any} conceptId
     * @param {any} [contexto=null]
     * @return código CIE10Model
     * @memberof SnomedCIE10Mapping
     */
    public transform(conceptId, contexto = null) {
        if (contexto) {
            this.setContexto(contexto);
        }
        return new Promise((resolve, reject) => {
            SnomedMapping.find({ conceptId }).sort('mapGroup mapPriority').then(async (mapping) => {
                /**
                 * Chequeamos regla a regla cual es la primera que se cumple
                 */
                let arreglo: any[] = [];
                for (let i = 0; i < mapping.length; i++) {
                    const rules = mapping[i] as any;
                    const rule = rules.mapRule;

                    if (this.check(rule)) {
                        if (rules.mapTarget.length > 0) {
                            let prom = cie10.model.findOne({
                                codigo: rules.mapTarget
                            });
                            arreglo.push(prom);
                        }
                    }
                }
                // Guarda cada una de las promesas incluidas las que son null
                let promesas = await Promise.all(arreglo);

                let docsRespuesta = promesas.filter(x => !!x);

                if (docsRespuesta.length) {
                    return resolve(docsRespuesta[0].codigo);
                } else {
                    // Chequea si existe un mapeo estático
                    staticMapping.model.findOne({ conceptId }).then((staticmap: any) => {
                        resolve(staticmap ? staticmap.mapTarget : null);
                    }).catch(err2 => {
                        reject(err2);
                    });
                }
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Verifica si se cumple el predicado de una regla.
     * @private
     * @param {any} predicado
     * @memberof SnomedCIE10Mapping
     */
    private check(predicado) {
        if (predicado.length > 0) {
            if (typeof predicado[0] === 'boolean') {
                return true;
            } else {
                let result = true;
                for (let i = 0; i < predicado.length; i++) {
                    const r = predicado[i];
                    if (r.concept === '248152002') {
                        result = result && this.sexo === 'f';
                    } else if (r.concept === '248153007') {
                        result = result && (this.sexo === 'm');
                    } else if (r.concept === '445518008') {
                        if (this.edadYear || this.edadDays) {
                            const edad = r.value.unit === 'days' ? this.edadDays : this.edadYear;
                            const value = Number(r.value.number);

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
