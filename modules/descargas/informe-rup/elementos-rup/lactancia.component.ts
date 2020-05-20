import { HTMLComponent } from '../../model/html-component.class';

export class LactanciaComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p>
                    {{ titulo }}:
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
            valor: this.getValor()
        };
    }

    getValor() {
        const valor = this.registro.valor || [];
        return valor.filter(v => v.checkbox).map(v => v.concepto.term).join(', ');

    }

}
