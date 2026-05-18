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
        {{#if estadoReceta}}
        <tr>
            <td colspan="2" style="border:0px none; padding: 0;">
                <div class="contenedor-bloque-texto">
                    <h6 class="bolder">
                        Estado Receta
                    </h6>
                    <h6>
                        {{ estadoReceta }}
                    </h6>
                </div>
            </td>
        </tr>
        {{/if}}
     </tbody>
     </table>
    </div>
    <table class="table table-bordered">
        <thead>
            <tr>
                <th>Medicamento</th>
                <th>Presentación</th>
                <th>Cantidad</th>
                <th>Dosis diaria</th>
                <th>Diagnóstico</th>
            </tr>
        </thead>
        <tbody>
        <br>
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
                </tr>
            {{/each}}
             <tr>
                <td colspan="6" style="font-weight: bold;font-style: italic;">
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
        let estadoReceta = null;

        const tieneReceta = this.prestacion.ejecucion.registros.some(registro =>
            registro.concepto?.conceptId === '182836005' || // Prescripción de medicamento
            registro.valor?.medicamentos?.length > 0
        );

        if (tieneReceta) {
            try {
                const recetaPorPrestacion: any = await Receta.findOne({
                    idPrestacion: this.prestacion._id.toString()
                }).sort({ createdAt: -1 });

                if (recetaPorPrestacion?.estadoActual?.tipo) {
                    estadoReceta = recetaPorPrestacion.estadoActual.tipo
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                }
            } catch (error) {
                estadoReceta = null;
            }
        }

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

        this.data = {
            registro: this.registro,
            esReceta: this.depth ? 1 : 0, // Si es 0 no muestra el código de barras
            idReceta: finalIdReceta,
            estadoReceta,
            barcodeBase64: await generateBarcodeBase64(finalIdReceta, 'code128')
        };
    }
}
