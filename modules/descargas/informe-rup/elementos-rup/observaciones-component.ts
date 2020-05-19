import { HTMLComponent } from '../../model/html-component.class';

export class ObservacionesComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}{{#if registro.valor}}:
                    <br>
                    <small>
                        {{{ registro.valor }}}
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
            registro: this.registro
        };
    }

}
