import { HTMLComponent } from '../../model/html-component.class';
export class ChecklistComponent extends HTMLComponent {
    template = `
    <div class="nivel-1">
    <p>
        {{ titulo }}
        {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}:
       <br>
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
            titulo: this.params.titulo || this.registro.concepto.term,
            registro: this.registro,
            valor: this.getValores()
        };

    }

    getValores() {
        const valores = this.registro.valor;

        if (valores) {
            return valores.map(v => v.term).join('<br>');

        }


    }

}
