import { HTMLComponent } from '../../model/html-component.class';

export class CalculoDeBostonComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p> {{ registro.concepto.term }}: </p>
            </div>
            <div class="subregistro">
                <p> CI: <small> {{ valor.ci }} </small> </p>
                <p> CT: <small> {{ valor.ct }} </small> </p>
                <p> CD: <small> {{ valor.cd }} </small> </p>
                <p> Total: <small> {{ valor.total }} </small> </p>
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
