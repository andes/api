import { HTMLComponent } from '../../model/html-component.class';
import { generateBarcodeBase64 } from '../../model/barcode';
import { Receta } from '../../../recetas/receta-schema';

export class RecetaMedicaComponent extends HTMLComponent {
    template = `
    <div class="nivel-1">
     <table class="table" style="width:100%; border:0px none; table-layout:fixed;">
     <tbody>
        <tr>
        <br>
            <td style="width:30%; vertical-align:top;border:0px none;">
                <p>
                    {{#if registro.valor.medicamentos}}<b>RECETA MÉDICA</b>{{/if}}
                </p>
            </td>
            <td style="width:70%; vertical-align:top; padding:0;border:0px none;">
                <div class="barcode">
                {{#if esReceta}}
                    <img src="data:image/png;base64,{{barcodeBase64}}" alt="{{idReceta}}" />
                     {{/if}}
                </div>
            </td>
        </tr>
     </tbody>
     </table>
    </div>
    <table class="table table-bordered">
        <thead>
            <tr>
                <th>Medicamento</th>
                <th>Cantidad</th>
                <th>Dosis diaria</th>
                <th>Diagnóstico</th>
                <th>Obra Social</th>
            </tr>
        </thead>
        <tbody>
        <br>
            {{#each registro.valor.medicamentos}}
                <tr>
                    <td> {{generico.term}} </td>
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
                    {{#if obraSocial}}
                        {{obraSocial.nombre}}
                        {{#if obraSocial.numeroAfiliado}}
                            <br><small>Af. {{obraSocial.numeroAfiliado}}</small>
                        {{/if}}
                    {{else}}
                        -
                    {{/if}}
                    </td>
                </tr>
            {{/each}}
             <tr>
                <td colspan="5" style="font-weight: bold;font-style: italic;">
                    {{#if esReceta}}
                Esta receta fue creada por emisor inscripto y valido en el Registro de Recetarios Electrónicos
del Ministerio de Salud de la Nación - RL-2025-24026558-APN-SSVEIYES#MS
{{/if}}
                </td>
            </tr>
        </tbody>
    </table>
    <br>`;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        // Buscar receta asociada al registro para obtener idReceta
        let idReceta = this.registro.idReceta;
        if (!idReceta && this.registro.id) {
            try {
                const receta: any = await Receta.findOne({ idRegistro: this.registro.id });
                if (receta) {
                    idReceta = receta.idReceta;
                }
            } catch (error) {
                idReceta = null;
            }
        }

        const finalIdReceta = idReceta || this.registro.id;

        let obraSocial = this.prestacion.paciente?.obraSocial || null;
        if (Array.isArray(obraSocial)) {
            obraSocial = obraSocial[0];
        }
        let obraSocialObj = null;
        if (obraSocial) {
            if (typeof obraSocial === 'string') {
                obraSocialObj = {
                    nombre: obraSocial,
                    numeroAfiliado: ''
                };
            } else {
                obraSocialObj = {
                    nombre: obraSocial.nombre || obraSocial.financiador || '',
                    numeroAfiliado: obraSocial.numeroAfiliado || ''
                };
            }
        }

        const registroClone = this.registro.toObject ? this.registro.toObject() : JSON.parse(JSON.stringify(this.registro));
        if (registroClone.valor?.medicamentos) {
            registroClone.valor.medicamentos = registroClone.valor.medicamentos.map(med => {
                return {
                    ...med,
                    obraSocial: med.obraSocial || (obraSocialObj ? {
                        nombre: obraSocialObj.nombre,
                        numeroAfiliado: obraSocialObj.numeroAfiliado
                    } : null)
                };
            });
        }

        this.data = {
            registro: registroClone,
            esReceta: this.depth ? 1 : 0, // Si es 0 no muestra el código de barras
            idReceta: finalIdReceta,
            barcodeBase64: await generateBarcodeBase64(finalIdReceta, 'code128')
        };
    }
}
