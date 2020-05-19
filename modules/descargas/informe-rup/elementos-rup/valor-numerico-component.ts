import { HTMLComponent } from '../../model/html-component.class';

export class ValorNumericoComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p>
                    {{ registro.concepto.term }}:
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
            unidad: this.params?.unit
        };
    }

}
