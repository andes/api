import { HTMLComponent } from '../../model/html-component.class';

export class AutocitadoComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p>
                    {{ registro.concepto.term }}:
                </p>
            </div>
            <div class="subregistro">
                <p> Motivo: <small> {{{ valor.motivo }}} </small> </p>
            </div>

        `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const datos = this.registro.valor.solicitudPrestacion;
        this.data = {
            registro: this.registro,
            valor: {
                motivo: datos.motivo
            }
        };
    }

}
