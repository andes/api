import * as moment from 'moment';
import { HTMLComponent } from '../../model/html-component.class';

export class SolicitudPrestacionDefaultComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p>
                    Solicitud de {{ registro.concepto.term }}:
                </p>
            </div>
            <div class="subregistro">
                <p> Diagnóstico/Motivo: <small> {{{ valor.motivo }}} </small> </p>
                <p> Indicaciones: <small> {{{ valor.indicaciones }}} </small> </p>
                {{#if valor.organizacionDestino}}
                    <p> Organización destino: <small> {{{ valor.organizacionDestino }}} </small> </p>
                {{/if}}
                <p> Profesional(es): <small> {{{ valor.profesionalesDestino }}} </small> </p>

                {{#each valor.extras }}
                    <p> {{ label }}: <small> {{{ value }}} </small> </p>

                {{/each}}
            </div>

        `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const datos = this.registro.valor.solicitudPrestacion;
        this.data = {
            registro: this.registro,
            valor: {
                motivo: datos.motivo,
                indicaciones: datos.indicaciones,
                organizacionDestino: datos.organizacionDestino?.nombre,
                profesionalesDestino: datos.profesionalesDestino?.map(y => y.nombreCompleto).join(' '),
                extras: this.getTemplateLabels()
            }
        };
    }

    getTemplateLabels() {
        const datos = this.registro.valor.solicitudPrestacion;
        const template = this.registro.valor.template;
        if (template) {
            const values = [];
            this.getItems(datos, template, values);
            return values;
        }
        return [];
    }

    getItems(model: any, template: any[], datos: any[]) {
        for (const item of template) {
            if (item.type === 'seccion') {
                this.getItems(model, item.componentes, datos);
            } else {
                const value = getter(model, item.key);
                let formateado = '';
                switch (item.type) {
                    case 'datetime':
                        formateado = moment(value).format(item.format === 'date' ? 'DD/MM/YYYY' : 'DD/MM/YYYY HH:mm');
                        break;
                    case 'select':
                    case 'radio':
                        if (Array.isArray(value)) {
                            formateado = value.map(i => i[item.labelField || 'nombre']).join(', ');
                        } else {
                            formateado = value[item.labelField || 'nombre'];
                        }
                        break;
                    case 'bool':
                        formateado = value ? 'Si' : 'No';
                        break;

                    default:
                        formateado = value;
                        if (item.suffix) {
                            formateado += ' ' + item.suffix;
                        }
                        break;
                }
                datos.push({
                    label: item.label,
                    value: formateado
                });
            }
        }
    }


}


function getter(model, key: string) {
    function inside(_model, keys: string[]) {
        if (keys.length === 1) {
            return _model[keys[0]];
        } else {
            const _key = keys[0];
            const nextKeys = keys.slice(1);
            if (!_model[_key]) {
                return null;
            }

            return inside(_model[_key], nextKeys);
        }
    }
    const _keys = key.split('.');
    return inside(model, _keys);
}
