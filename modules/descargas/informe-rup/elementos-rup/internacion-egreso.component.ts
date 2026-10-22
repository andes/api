import * as moment from 'moment';
import { HTMLComponent } from '../../model/html-component.class';
import { registroToHTML } from '../utils/registro-to-html';

export class InternacionEgresoComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}:
            </p>
        </div>
        <div class="subregistro" style="margin-left: 1.5rem;">
            {{#if valor.fechaEgreso}}
                <p>&bull; Fecha de egreso: <small>{{ valor.fechaEgreso }}</small></p>
            {{/if}}
            {{#if valor.diasDeEstada}}
                <p>&bull; Días de estada: <small>{{ valor.diasDeEstada }}</small></p>
            {{/if}}
            {{#if valor.tipoEgreso}}
                <p>&bull; Tipo de egreso: <small>{{ valor.tipoEgreso }}</small></p>
            {{/if}}
            {{#if valor.organizacionDestino}}
                <p>&bull; Organización destino: <small>{{ valor.organizacionDestino }}</small></p>
            {{/if}}
            {{#if valor.diagnosticoPrincipal}}
                <p>&bull; Diagnóstico principal al egreso: <small>{{ valor.diagnosticoPrincipal }}</small></p>
                {{#if valor.primeraVez}}
                    <p style="margin-left: 1rem;">&ndash; Es primera vez: <small>{{ valor.primeraVez }}</small></p>
                {{/if}}
            {{/if}}
            {{#if valor.otrosDiagnosticos.length}}
                <p>&bull; Otros diagnósticos:
                    {{#each valor.otrosDiagnosticos}}
                        <br>&emsp;&ndash; <small>{{ this }}</small>
                    {{/each}}
                </p>
            {{/if}}
            {{#if valor.causaExterna}}
                <p>&bull; Causa externa:
                    {{#if valor.causaExterna.comoSeProdujo}}
                        <br>&emsp;&ndash; <small>Cómo se produjo: {{ valor.causaExterna.comoSeProdujo }}</small>
                    {{/if}}
                    {{#if valor.causaExterna.producidaPor}}
                        <br>&emsp;&ndash; <small>Producido por: {{ valor.causaExterna.producidaPor }}</small>
                    {{/if}}
                    {{#if valor.causaExterna.lugar}}
                        <br>&emsp;&ndash; <small>Lugar donde ocurrió: {{ valor.causaExterna.lugar }}</small>
                    {{/if}}
                </p>
            {{/if}}
            {{#if valor.procedimientosQuirurgicos.length}}
                <p>&bull; Procedimientos quirúrgicos:
                    {{#each valor.procedimientosQuirurgicos}}
                        <br>&emsp;&ndash; <small>{{ nombre }}{{#if fecha}} ({{ fecha }}){{/if}}</small>
                    {{/each}}
                </p>
            {{/if}}
            {{#if valor.obstetrico}}
                <p>&bull; Eventos obstétricos:
                    {{#if valor.obstetrico.terminacionEmbarazo}}
                        <br>&emsp;&ndash; <small>Fecha terminación: {{ valor.obstetrico.terminacionEmbarazo }}</small>
                    {{/if}}
                    {{#if valor.obstetrico.edadGestacional}}
                        <br>&emsp;&ndash; <small>Edad gestacional: {{ valor.obstetrico.edadGestacional }}</small>
                    {{/if}}
                    {{#if valor.obstetrico.paridad}}
                        <br>&emsp;&ndash; <small>Paridad: {{ valor.obstetrico.paridad }}</small>
                    {{/if}}
                    {{#if valor.obstetrico.tipoParto}}
                        <br>&emsp;&ndash; <small>Tipo de parto: {{ valor.obstetrico.tipoParto }}</small>
                    {{/if}}
                    {{#each valor.obstetrico.nacimientos}}
                        <br>&emsp;&ndash; <small>Nacimiento:
                            {{#if pesoAlNacer}}Peso: {{ pesoAlNacer }}{{/if}}
                            {{#if condicionAlNacer}} | Condición: {{ condicionAlNacer }}{{/if}}
                            {{#if terminacion}} | Terminación: {{ terminacion }}{{/if}}
                            {{#if sexo}} | Sexo: {{ sexo }}{{/if}}
                        </small>
                    {{/each}}
                </p>
            {{/if}}

            {{#each registros}}
                {{{this}}}
            {{/each}}
        </div>
    `;

    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const rawValor = this.registro.valor?.InformeEgreso || this.registro.valor?.informeEgreso || this.registro.valor || {};

        const ps = (this.registro.registros || []).map(registro => {
            if (this.isEmpty(registro)) {
                return '';
            }
            return registroToHTML(this.prestacion, registro, (this.depth || 0) + 1);
        });
        const registros = await Promise.all(ps);

        let diagnosticoPrincipal = '';
        let primeraVez = '';
        if (rawValor.diagnosticoPrincipal) {
            const dp = rawValor.diagnosticoPrincipal;
            diagnosticoPrincipal = [dp.codigo, dp.nombre].filter(Boolean).join(' - ') || (typeof dp === 'string' ? dp : '');
            if (dp.c2 !== undefined || this.registro.esPrimeraVez !== undefined) {
                primeraVez = this.registro.esPrimeraVez ? 'SI' : 'NO';
            }
        }

        const otrosDiagnosticos = (rawValor.otrosDiagnosticos || []).map(od => {
            if (typeof od === 'string') {
                return od;
            }
            return [od.codigo, od.nombre].filter(Boolean).join(' - ') || od.term || '';
        }).filter(Boolean);

        let causaExterna = null;
        if (rawValor.causaExterna) {
            const ce = rawValor.causaExterna;
            const comoSeProdujo = ce.comoSeProdujo?.nombre || ce.comoSeProdujo || '';
            const producidaPor = ce.producidaPor?.nombre || ce.producidaPor || '';
            const lugar = ce.lugar?.nombre || ce.lugar || '';
            if (comoSeProdujo || producidaPor || lugar) {
                causaExterna = { comoSeProdujo, producidaPor, lugar };
            }
        }

        const procedimientosQuirurgicos = (rawValor.procedimientosQuirurgicos || []).map(pq => {
            const nombre = pq.procedimiento?.nombre || pq.procedimiento?.term || pq.procedimiento || pq.nombre || '';
            const fecha = pq.fecha ? moment(pq.fecha).format('DD/MM/YYYY') : '';
            return { nombre, fecha };
        }).filter(pq => pq.nombre);

        let obstetrico = null;
        const nacimientos = (rawValor.nacimientos || []).filter(n => n.pesoAlNacer || n.condicionAlNacer || n.terminacion || n.sexo).map(n => ({
            pesoAlNacer: n.pesoAlNacer ? `${n.pesoAlNacer} g` : '',
            condicionAlNacer: n.condicionAlNacer || '',
            terminacion: n.terminacion || '',
            sexo: n.sexo || ''
        }));
        if (rawValor.terminacionEmbarazo || rawValor.edadGestacional || rawValor.paridad || rawValor.tipoParto || nacimientos.length > 0) {
            obstetrico = {
                terminacionEmbarazo: rawValor.terminacionEmbarazo ? moment(rawValor.terminacionEmbarazo).format('DD/MM/YYYY') : '',
                edadGestacional: rawValor.edadGestacional || '',
                paridad: rawValor.paridad || '',
                tipoParto: rawValor.tipoParto || '',
                nacimientos
            };
        }

        const organizacionDestino = rawValor.UnidadOrganizativaDestino?.nombre ||
            rawValor.organizacionDestino?.nombre ||
            rawValor.UnidadOrganizativaDestino ||
            rawValor.organizacionDestino || '';

        this.data = {
            registro: this.registro,
            registros,
            valor: {
                fechaEgreso: rawValor.fechaEgreso ? moment(rawValor.fechaEgreso).format('DD/MM/YYYY HH:mm [hs]') : '',
                diasDeEstada: rawValor.diasDeEstada != null ? `${rawValor.diasDeEstada}` : '',
                tipoEgreso: rawValor.tipoEgreso?.nombre || rawValor.tipoEgreso || '',
                organizacionDestino,
                diagnosticoPrincipal,
                primeraVez,
                otrosDiagnosticos,
                causaExterna,
                procedimientosQuirurgicos,
                obstetrico
            }
        };
    }

    isEmpty(registro) {
        const hasValue = !!registro.valor;
        const hasChilds = registro.registros?.length > 0;
        const emptyChilds = (registro.registros as any[])?.every(r => this.isEmpty(r));

        return !hasValue && emptyChilds;
    }
}
