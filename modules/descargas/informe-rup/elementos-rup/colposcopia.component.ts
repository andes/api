import { HTMLComponent } from '../../model/html-component.class';

export class ColposcopiaComponent extends HTMLComponent {
    template = `
    <div >
        <p>
            {{#if registro.valor.colposcopia}}<b>COLPOSCOPIA</b>{{/if}}
        </p>
    </div>
    <small>
        <p>
            {{ registro.concepto.term }}
            {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}
        </p>
        
        <div >
            <strong>Colposcopia {{registro.valor.colposcopia.colposcopia.nombre}}</strong>
            <div>Detalle colposcopia: {{ registro.valor.colposcopia.detalle }}</div>
        </div>
        
     {{#if registro.valor.colposcopia.visibilidadUEC}}
        <div >
            <span>Zona Transformación {{registro.valor.colposcopia.visibilidadUEC.nombre}}</span>
        </div>
        {{/if}}

        {{#if registro.valor.colposcopia.zona}}
        <div >
            <span>Zona Transformación {{registro.valor.colposcopia.zona}}</span>
        </div>
        {{/if}}
        
        {{#if registro.valor.colposcopia.hallazgos}}
        <div >
            <span>Hallazgo: {{registro.valor.colposcopia.hallazgos.nombre}}</span>
        </div>
        {{/if}}
        
        {{#if registro.valor.colposcopia.biopsia}}
        <div >
            <span>Se toma biopsia</span>
        </div>
        {{else}}
        <div>
            <span>No toma biopsia</span>
        </div>
        {{/if}}
        
        {{#if registro.valor.colposcopia.testSchiller}}
        <div >
            <span>Test Schiller positivo</span>
        </div>
        {{else}}
        <div >
            <span>Test Schiller negativo</span>
        </div>
        {{/if}}
        
        {{#if registro.valor.colposcopia.evaluacionEndocervical}}
        <div >
            <span>Conducto endocervical evaluado</span>
        </div>
        {{/if}}
    </small>
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
