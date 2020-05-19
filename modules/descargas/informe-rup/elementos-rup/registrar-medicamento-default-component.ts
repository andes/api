import { HTMLComponent } from '../../model/html-component.class';

export class RegistrarMedicamentoDefaultComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p>
                    {{ registro.concepto.term }}
                    {{#if valor.recetable}}
                        (recetable)
                    {{else}}
                        (no recetable)
                    {{/if}}
                    :

                    Estado: <small> {{ valor.estado }} </small>
                    Cantidad: <small> {{ valor.cantidad }} {{ valor.unidad }} </small>
                    Durante: <small> {{ valor.duracion.cantidad }} {{ valor.duracion.unidad }} </small>
                </p>
            </div>
            <div class="subregistro">
                <p> Indicación: <small> {{ valor.indicacion }} </small> </p>
            </div>

        `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        this.data = {
            registro: this.registro,
            valor: this.registro.valor || {}
        };
    }

}
