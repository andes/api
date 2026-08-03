import { HTMLComponent } from '../../model/html-component.class';

export class SelectPorRefsetComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p>
                    {{ titulo }}
                    {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}:
                    <small>
                        {{{ valor }}}
                    </small>
                </p>
            </div>

        `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        this.data = {
            titulo: this.params.titulo || this.params.title || this.registro.concepto.term,
            registro: this.registro,
            valor: this.getValor()
        };
    }

    getValor() {
        const valor = this.registro.valor;
        if (!valor) { return ''; }
        const getDisplay = (v) => v.label || v.term || (v.concepto && v.concepto.term) || v.nombre || '';
        if (Array.isArray(valor)) {
            return valor.map(getDisplay).filter(Boolean).join('<br>');
        }
        return getDisplay(valor);
    }

}
