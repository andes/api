
import { HTMLComponent } from '../../model/html-component.class';
import { registroToHTML } from '../utils/registro-to-html';

export class MoleculaBaseComponent extends HTMLComponent {
    template = `
        {{#if showTitle}}
            <div class="nivel-1">
                <p>
                    {{ registro.concepto.term }}:
                </p>
            </div>
        {{/if}}
        <div {{#if showTitle}}class="subregistro"{{/if}}>
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
            return registroToHTML(this.prestacion, registro, this.depth + 1);
        });
        const registros = await Promise.all(ps);

        this.data = {
            registro: this.registro,
            registros,
            showTitle: this.depth === 0
        };
    }

}
