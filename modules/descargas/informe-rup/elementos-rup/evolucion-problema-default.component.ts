
import { HTMLComponent } from '../../model/html-component.class';

export class EvolucionProblemaDefaultComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}
                {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}
                {{#if evolucion}}:
                    <br>
                    <br>
                    <small class="subregistro">
                        {{{ evolucion }}}
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
            evolucion: this.registro.valor.evolucion?.replace('<p>', '')
        };
    }

}
