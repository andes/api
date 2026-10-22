import * as moment from 'moment';
import { HTMLComponent } from '../../model/html-component.class';
import { registroToHTML } from '../utils/registro-to-html';

export class InternacionIngresoComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}:
            </p>
        </div>
        <div class="subregistro" style="margin-left: 1.5rem;">
            {{#if valor.fechaIngreso}}
                <p>&bull; Fecha de ingreso: <small>{{ valor.fechaIngreso }}</small></p>
            {{/if}}
            {{#if valor.origen}}
                <p>&bull; Origen hospitalización: <small>{{ valor.origen }}</small></p>
            {{/if}}
            {{#if valor.organizacionOrigen}}
                <p>&bull; Organización de origen: <small>{{ valor.organizacionOrigen }}</small></p>
            {{/if}}
            {{#if valor.motivo}}
                <p>&bull; Motivo de ingreso: <small>{{ valor.motivo }}</small></p>
            {{/if}}
            {{#if valor.profesional}}
                <p>&bull; Profesional responsable: <small>{{ valor.profesional }}</small></p>
            {{/if}}
            {{#if valor.especialidades}}
                <p>&bull; Especialidad/es: <small>{{ valor.especialidades }}</small></p>
            {{/if}}
            {{#if valor.asociado}}
                <p>&bull; Cobertura: <small>{{ valor.asociado }}</small></p>
            {{/if}}
            {{#if valor.obraSocial}}
                <p>&bull; Obra social: <small>{{ valor.obraSocial }}</small></p>
            {{/if}}
            {{#if valor.nroCarpeta}}
                <p>&bull; N° Carpeta: <small>{{ valor.nroCarpeta }}</small></p>
            {{/if}}
            {{#if valor.situacionLaboral}}
                <p>&bull; Situación laboral: <small>{{ valor.situacionLaboral }}</small></p>
            {{/if}}
            {{#if valor.ocupacionHabitual}}
                <p>&bull; Ocupación habitual: <small>{{ valor.ocupacionHabitual }}</small></p>
            {{/if}}
            {{#if valor.nivelInstruccion}}
                <p>&bull; Nivel de instrucción: <small>{{ valor.nivelInstruccion }}</small></p>
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
        const rawValor = this.registro.valor?.informeIngreso || this.registro.valor?.InformeIngreso || this.registro.valor || {};

        const ps = (this.registro.registros || []).map(registro => {
            if (this.isEmpty(registro)) {
                return '';
            }
            return registroToHTML(this.prestacion, registro, (this.depth || 0) + 1);
        });
        const registros = await Promise.all(ps);

        let especialidades = '';
        if (Array.isArray(rawValor.especialidades)) {
            especialidades = rawValor.especialidades.map(e => e.term || e.nombre || e.fsn || e).filter(Boolean).join(', ');
        }

        let profesional = '';
        if (rawValor.profesional) {
            profesional = rawValor.profesional.nombreCompleto ||
                [rawValor.profesional.apellido, rawValor.profesional.nombre].filter(Boolean).join(', ') ||
                (typeof rawValor.profesional === 'string' ? rawValor.profesional : '');
        }

        let obraSocial = '';
        if (rawValor.obraSocial) {
            obraSocial = rawValor.obraSocial.nombre || rawValor.obraSocial.financiador || (typeof rawValor.obraSocial === 'string' ? rawValor.obraSocial : '');
        }

        let ocupacionHabitual = '';
        if (rawValor.ocupacionHabitual) {
            ocupacionHabitual = rawValor.ocupacionHabitual.nombre || (typeof rawValor.ocupacionHabitual === 'string' ? rawValor.ocupacionHabitual : '');
        }

        let organizacionOrigen = '';
        if (rawValor.organizacionOrigen) {
            organizacionOrigen = rawValor.organizacionOrigen.nombre || (typeof rawValor.organizacionOrigen === 'string' ? rawValor.organizacionOrigen : '');
        }

        this.data = {
            registro: this.registro,
            registros,
            valor: {
                fechaIngreso: rawValor.fechaIngreso ? moment(rawValor.fechaIngreso).format('DD/MM/YYYY HH:mm [hs]') : '',
                origen: rawValor.origen?.nombre || rawValor.origen || '',
                organizacionOrigen,
                motivo: rawValor.motivo || '',
                profesional,
                especialidades,
                asociado: rawValor.asociado || '',
                obraSocial,
                nroCarpeta: rawValor.nroCarpeta || '',
                situacionLaboral: rawValor.situacionLaboral || '',
                ocupacionHabitual,
                nivelInstruccion: rawValor.nivelInstruccion || ''
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
