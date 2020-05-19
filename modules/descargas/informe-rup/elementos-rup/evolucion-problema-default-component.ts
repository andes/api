
import { HTMLComponent } from '../../model/html-component.class';

export class EvolucionProblemaDefaultComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}:
                <br>
                <small>
                    {{{ registro.valor.evolucion }}}
                </small>
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
