import { HTMLComponent } from '../../model/html-component.class';

export class OdontogramaRefsetComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}
                {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}
                

                    {{#each valor.infDer}}
                        <p>&emsp;Cuadrante Inferior Derecho:
                        <small class="subregistro">
                            pieza N°{{ concepto.term }} | cara: {{ cara }} | cuadrante: {{ cuadrante }}
                        </small>
                    {{/each}}

                    {{#each valor.infDerT}}
                        <p>&emsp;Cuadrante Inferior Derecho Temporal:
                        <small class="subregistro">
                            pieza N°{{ concepto.term }} | cara: {{ cara }} | cuadrante: {{ cuadrante }}
                        </small>
                    {{/each}}

                    {{#each valor.infIzq}}
                        <p>&emsp;Cuadrante Inferior Izquierdo:
                        <small class="subregistro">
                            pieza N°{{ concepto.term }} | cara: {{ cara }} | cuadrante: {{ cuadrante }}
                        </small>
                    {{/each}}

                     {{#each valor.infIzqT}}
                        <p>&emsp;Cuadrante Inferior Izquierdo Temporal:
                        <small class="subregistro">
                            pieza N°{{ concepto.term }} | cara: {{ cara }} | cuadrante: {{ cuadrante }}
                        </small>
                    {{/each}}

                     {{#each valor.supDer}}
                        <p>&emsp;Cuadrante Superior Derecho:
                        <small class="subregistro">
                            pieza N°{{ concepto.term }} | cara: {{ cara }} | cuadrante: {{ cuadrante }}
                        </small>
                    {{/each}}

                     {{#each valor.supDerT}}
                        <p>&emsp;Cuadrante Superior Derecho Temporal:
                        <small class="subregistro">
                            pieza N°{{ concepto.term }} | cara: {{ cara }} | cuadrante: {{ cuadrante }}
                        </small>
                    {{/each}}

                          {{#each valor.supIzq}}
                        <p>&emsp;Cuadrante Superior Izquierdo:
                        <small class="subregistro">
                            pieza N°{{ concepto.term }} | cara: {{ cara }} | cuadrante: {{ cuadrante }}
                        </small>
                    {{/each}}

                           {{#each valor.supIzqT}}
                        <p>&emsp;Cuadrante Superior Izquierdo Temporal:
                        <small class="subregistro">
                            pieza N°{{ concepto.term }} | cara: {{ cara }} | cuadrante: {{ cuadrante }}
                        </small>
                    {{/each}}



           
    `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const infDer = this.registro.valor.odontograma.cuadranteInferiorDerecho.filter(diente => diente.cara);
        const infIzq = this.registro.valor.odontograma.cuadranteInferiorIzquierdo.filter(diente => diente.cara);
        const supDer = this.registro.valor.odontograma.cuadranteSuperiorDerecho.filter(diente => diente.cara);
        const supIzq = this.registro.valor.odontograma.cuadranteSuperiorIzquierdo.filter(diente => diente.cara);

        const infDerT = this.registro.valor.odontograma.cuadranteInferiorDerechoTemporal.filter(diente => diente.cara);
        const infIzqT = this.registro.valor.odontograma.cuadranteInferiorIzquierdoTemporal.filter(diente => diente.cara);
        const supDerT = this.registro.valor.odontograma.cuadranteSuperiorDerechoTemporal.filter(diente => diente.cara);
        const supIzqT = this.registro.valor.odontograma.cuadranteSuperiorIzquierdoTemporal.filter(diente => diente.cara);

        this.data = {
            registro: this.registro,
            valor: {
                infDer,
                infDerT,
                infIzq,
                infIzqT,
                supDer,
                supDerT,
                supIzq,
                supIzqT
            }
        };
    }

}
