import { HTMLComponent } from '../../model/html-component.class';

export class RecetaMedicaComponent extends HTMLComponent {
    template = `
    <div class="nivel-1">
    <p>
        {{#if registro.valor.medicamentos}}<b>RECETA MÉDICA</b>{{/if}}
    </p>
    </div>
    <table class="table table-bordered">
        <thead>
            <tr>
                <th>Medicamento</th>
                <th>Presentación</th>
                <th>Cantidad</th>
                <th>Dosis diaria</th>
                <th>Diagnóstico</th>
                <th>Observaciones</th>
            </tr>
        </thead>
        <tbody>
            {{#each registro.valor.medicamentos}}
                <tr>
                    <td> {{generico.term}} </td>
                    <td>
                    {{ unidades }} {{presentacion.term }}(s)
                    </td>
                    <td>
                    {{ cantidad }} envase(s)
                    </td>
                    <td>
                    {{#if dosisDiaria.cantidad }}
                    {{ dosisDiaria.cantidad }} {{presentacion.term }}(s) por {{ dosisDiaria.dias }} días
                    {{/if}}
                    </td>
                    <td>
                    {{ diagnostico }}
                    </td>
                    <td>
                    {{#if tratamientoProlongado }}
                        Tratamiento prolongado |
                    {{/if}}
                    {{ tipoReceta }}
                    </td>
                </tr>
            {{/each}}
        </tbody>
    </table>
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
