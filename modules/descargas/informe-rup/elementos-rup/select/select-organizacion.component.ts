import { HTMLComponent } from '../../../model/html-component.class';

export class SelectOrganizacionComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p>
                    {{ titulo }}
                    {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}:
                    <small> {{{ valor }}} </small>
                </p>
            </div>

        `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        this.data = {
            titulo: this.params.titulo || this.registro.concepto.term,
            registro: this.registro,
            valor: this.getValor()
        };
    }

    getValor() {
        if (!this.registro.valor) {
            return '(sin dato)';
        }
        const valor = this.registro.valor;
        if (Array.isArray(valor)) {
            return valor.map(v => `${v.nombre}`).join(', ');
        } else {
            return `${valor.nombre}`;
        }

    }

}
