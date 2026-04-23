import { HTMLComponent } from '../../model/html-component.class';

export class OdontogramaRefsetComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                <strong>{{ registro.concepto.term }}</strong>
                {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}
            </p>

            {{#if snapshot}}
                <div style="text-align: center; margin: 20px 0; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
                    <img src="{{ snapshot }}" style="max-width: 100%; height: auto;">
                </div>
            {{/if}}

            <div class="detalle-odontograma" style="margin-top: 10px;">
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
            </div>
        </div>
    `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const infDer = this.registro.valor.odontograma?.cuadranteInferiorDerecho.filter(diente => diente.cara) || [];
        const infIzq = this.registro.valor.odontograma?.cuadranteInferiorIzquierdo.filter(diente => diente.cara) || [];
        const supDer = this.registro.valor.odontograma?.cuadranteSuperiorDerecho.filter(diente => diente.cara) || [];
        const supIzq = this.registro.valor.odontograma?.cuadranteSuperiorIzquierdo.filter(diente => diente.cara) || [];

        const infDerT = this.registro.valor.odontograma?.cuadranteInferiorDerechoTemporal.filter(diente => diente.cara) || [];
        const infIzqT = this.registro.valor.odontograma?.cuadranteInferiorIzquierdoTemporal.filter(diente => diente.cara) || [];
        const supDerT = this.registro.valor.odontograma?.cuadranteSuperiorDerechoTemporal.filter(diente => diente.cara) || [];
        const supIzqT = this.registro.valor.odontograma?.cuadranteSuperiorIzquierdoTemporal.filter(diente => diente.cara) || [];

        this.data = {
            registro: this.registro,
            snapshot: this.registro.valor.snapshot,
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
