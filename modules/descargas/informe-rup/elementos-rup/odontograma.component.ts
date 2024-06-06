import { HTMLComponent } from '../../model/html-component.class';

export class OdontogramaRefsetComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}
                {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}
                {{#if registro.valor}}:
                    <small class="subregistro">
                        {{{ valor }}}
                    </small>
                {{/if}}
            </p>
        </div>
    `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        this.data = {
            registro: this.registro,
            valor: this.registro.valor
        };
    }

}
