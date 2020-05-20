import { HTMLComponent } from '../../model/html-component.class';

// No es la verdadera implementacion del valor numerico

export function ValorNumericoFactory(unidad) {

    return class DefaultComponent extends HTMLComponent {
        template = `
            <div class="nivel-1">
                <p>
                    {{ registro.concepto.term }}
                    {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}:
                    <small>
                        {{{ registro.valor }}}{{unidad}}
                    </small>
                </p>
            </div>

        `;
        constructor(private prestacion, private registro, private params, private depth) {
            super();
        }

        async process() {
            this.data = {
                registro: this.registro,
                unidad
            };
        }

    };
}
