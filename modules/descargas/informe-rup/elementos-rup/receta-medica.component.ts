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
                    {{ cantEnvases}} envase(s) de {{ cantidad }} {{presentacion.term }}(s)  
                    </td>
                    <td>
                    {{#if dosisDiaria.dosis}}
                    {{ dosisDiaria.dosis }}
                    cada {{ dosisDiaria.intervalo.nombre }}  
                    {{/if}}
                     {{#if dosisDiaria.dias}}
                     durante {{ dosisDiaria.dias }} día(s)
                     {{/if}}
                    </td>
                    <td>
                    {{ diagnostico.term }}
                    </td>
                    <td>
                    {{#if tratamientoProlongado }}
                        Tratamiento prolongado |
                    {{/if}}
                    {{#if tipoReceta }}
                    {{ tipoReceta.nombre }}
                      {{/if}}
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
