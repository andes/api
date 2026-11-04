import { HTMLComponent } from '../../model/html-component.class';
import { registrarEventoEvolucion } from '../../../rup/evolucion.log';
import { normalizarValorEvolucion } from '../../../rup/utils/evolucion';

export class EvolucionProblemaDefaultComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}
                {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}
                {{#if evolucion}}:
                    <br>
                    <br>
                    <small class="subregistro">
                        {{{ evolucion }}}
                    </small>
                {{/if}}
            </p>
        </div>
    `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const resultado = normalizarValorEvolucion(this.registro.valor);

        if (resultado.invalida) {
            const error: any = new Error(`El registro ${this.registro.id} tiene un formato inválido en el campo evolución`);
            error.status = 500;
            registrarEventoEvolucion('error', 'informe:evolucion-formato-invalido', {
                prestacionId: this.prestacion?.id,
                registroId: this.registro.id,
                conceptoId: this.registro.concepto?.conceptId,
                origen: 'informe'
            }, error);
            throw error;
        }

        if (resultado.normalizada) {
            registrarEventoEvolucion('info', 'informe:evolucion-legacy', {
                prestacionId: this.prestacion?.id,
                registroId: this.registro.id,
                conceptoId: this.registro.concepto?.conceptId,
                origen: 'informe'
            });
        }

        this.data = {
            registro: this.registro,
            evolucion: resultado.texto.replace('<p>', '')
        };
    }

}
