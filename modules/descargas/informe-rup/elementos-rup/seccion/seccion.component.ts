import { HTMLComponent } from '../../../model/html-component.class';
import { registroToHTML } from '../../utils/registro-to-html';

export class SeccionComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}:
                <br><br>
                <small>
                    {{{ registro.valor }}}
                </small>
            </p>
        </div>
        <div class="subregistro">
            {{#each registros}}
                {{{this}}}
            {{/each}}
        </div>
    `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const ps = this.registro.registros.map(registro => {
            return registroToHTML(this.prestacion, registro, 0);
        });
        const registros = await Promise.all(ps);

        this.data = {
            registro: this.registro,
            registros,
        };
    }

}
