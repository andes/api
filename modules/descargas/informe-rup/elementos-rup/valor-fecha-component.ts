import * as moment from 'moment';
import { HTMLComponent } from '../../model/html-component.class';

export class ValorFechaComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p>
                    {{ registro.concepto.term }}
                    {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}:
                    <small>
                        {{{ fecha }}}
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
            fecha: this.format()
        };
    }

    format() {
        switch (this.params.type) {
            case 'date':
                return moment(this.registro.valor).format('DD/MM/YYYY');
            case 'datetime':
                return moment(this.registro.valor).format('DD/MM/YYYY hh:mm');
            case 'time':
                return moment(this.registro.valor).format('hh:mm');
            default:
                return '';

        }
    }
}
