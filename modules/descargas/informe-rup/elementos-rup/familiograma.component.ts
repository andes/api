import { HTMLComponent } from '../../model/html-component.class';

export class FamiliogramaComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                <strong>{{ registro.concepto.term }}</strong>
                {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}
            </p>

            {{#if imagen}}
                <div style="text-align: center; margin: 16px 0; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; background: #ffffff;">
                    <img src="{{ imagen }}" style="max-width: 100%; height: auto;">
                </div>
            {{/if}}

            {{#if observaciones}}
                <p style="margin-top: 8px;">
                    <strong>Observaciones:</strong> {{ observaciones }}
                </p>
            {{/if}}
        </div>
    `;

    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const conceptId = this.registro.concepto?.conceptId;
        if (conceptId === '405202004') {
            this.template = '';
            this.data = {};
            return;
        }

        const valor = this.registro.valor || {};
        let imagen = valor.snapshot || null;

        if (!imagen && valor.svg) {
            const base64Svg = Buffer.from(valor.svg, 'utf8').toString('base64');
            imagen = `data:image/svg+xml;base64,${base64Svg}`;
        }

        this.data = {
            registro: this.registro,
            imagen,
            observaciones: valor.observaciones || ''
        };
    }
}
