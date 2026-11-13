
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
        // paliativo para epicrisis con evoluciones mal guardadas. Debería resolverse en el front
        const evoString = !!(typeof this.registro.valor.evolucion === 'string');
        this.data = {
            registro: this.registro,
            evolucion: evoString ? this.registro.valor.evolucion?.replace('<p>', '') : null
        };
    }

}
