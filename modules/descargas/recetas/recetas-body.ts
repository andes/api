import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';
import { generateBarcodeSVG } from '../model/barcode';
import { makeFsFirma } from '../../../core/tm/schemas/firmaProf';
import { streamToBase64 } from '../../../core/tm/controller/file-storage';
import { searchMatriculas } from '../../../core/tm/controller/profesional';
import { Profesional } from '../../../core/tm/schemas/profesional';

export class RecetasBody extends HTMLComponent {
    template = `
        <main>
            {{#each recetas}}
            <section class="contenedor-informe receta-page" style="{{#unless @last}}page-break-after: always;{{/unless}} margin-top:0; padding-top:0;">
                <article class="cabezal-conceptos horizontal" style="width:100%; display:block; margin-top:0; padding-top:0;">
                    <div style="display:flex; gap: 2rem; width:100%; margin-top:0; flex-wrap: wrap;">
                        <div class="contenedor-bloque-texto">
                            <h6 class="bolder">Vigente Desde</h6>
                            <h6>{{fechaEmision}}</h6>
                        </div>
                        <div class="contenedor-bloque-texto">
                            <h6 class="bolder">Fecha de Vencimiento</h6>
                            <h6>{{fechaVencimiento}}</h6>
                        </div>
                    </div>
                </article>
                <hr style="margin-top:0.15cm;">
                <div>
                    <table style="width:100%; border:0px none; table-layout:fixed;">
                        <tbody>
                            <tr>
                                <td style="width:65%; vertical-align:top; border:0px none; padding:0;">
                                    <h3 style="margin:0; font-size:0.32cm;">RECETA MÉDICA</h3>
                                    <div style="margin-top:0.15cm;">
                                        <h6 class="volanta" style="display:inline;">ESTADO RECETA. </h6>
                                        <h6 style="display:inline; font-weight:900; text-transform: capitalize;">{{estadoReceta}}</h6>
                                    </div>
                                </td>
                                <td style="width:35%; vertical-align:top; text-align:right; border:0px none; padding:0;">
                                    <div class="barcode" style="text-align:right;">
                                        {{{barcodeSVG}}}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <table class="table table-bordered" style="width:100%; margin-top:0.2cm;">
                        <thead>
                            <tr>
                                <th colspan="2" style="text-align:left; background-color:#f0f0f0; font-size:0.26cm; padding:0.15cm;">
                                    <div>{{nombre}}</div>
                                    {{#if esMagistral}}<div style="font-weight:900; font-size:0.22cm; margin-top:0.1cm;">FÓRMULA MAGISTRAL</div>{{/if}}
                                    {{#if tratamientoProlongado}}<div style="font-weight:700; font-size:0.22cm; margin-top:0.05cm;">TRATAMIENTO PROLONGADO — Mes {{ordenTratamiento}} de {{totalTratamiento}}</div>{{/if}}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight:900;">Cantidad</td>
                                <td>{{cantidad}}</td>
                            </tr>
                            <tr>
                                <td style="font-weight:900;">Dosis diaria</td>
                                <td>{{dosisDiaria}}</td>
                            </tr>
                            <tr>
                                <td style="font-weight:900;">Diagnóstico</td>
                                <td>{{diagnostico}}</td>
                            </tr>
                            <tr>
                                <td style="font-weight:900;">Obra Social</td>
                                <td>{{obraSocial}}</td>
                            </tr>
                        </tbody>
                    </table>

                    {{#if notaMedica}}
                    <div style="margin-top:0.25cm;">
                        <h6 class="volanta">NOTA MÉDICA PARA EL PACIENTE</h6>
                        <p style="font-style:italic; font-size:0.23cm; margin:0.05cm 0 0 0;">{{notaMedica}}</p>
                    </div>
                    {{/if}}
                    {{#if firma}}
                    <div style="margin-top:0.8cm; text-align:center;">
                        <p style="font-weight:bold; font-style:italic; font-size:0.24cm; margin:0 0 0.15cm 0;">Este documento ha sido firmado electronicamente por:</p>
                        {{#if firma}}<img src="data:image/png;base64,{{{firma}}}" style="max-height:2cm; max-width:5cm; display:block; margin:0 auto;" />{{/if}}
                        <hr style="width:7cm; margin:0.25cm auto 0.15cm auto;" />
                        <p style="font-weight:bold; font-size:0.22cm; margin:0;">{{detalle}}</p>
                        {{#if matriculas}}<p style="font-size:0.18cm; line-height:0.24cm; margin:0.15cm 0 0 0;">{{{matriculas}}}</p>{{/if}}
                    </div>
                    {{/if}}
                </div>
            </section>
            {{/each}}
        </main>
    `;

    constructor(
        public prestacion,
        public paciente,
        public organizacion,
        public recetasData: any[],
        public registroId: string | null
    ) {
        super();
    }

    public async process() {

        const recetas = [];
        for (const receta of this.recetasData) {
            const esInsumo = !!receta.insumo;
            const fechaEmision = moment(receta.fechaRegistro).format('DD/MM/YYYY');
            const fechaVencimiento = moment(receta.fechaRegistro).add(30, 'days').format('DD/MM/YYYY');

            let nombre = '';
            if (esInsumo) {
                nombre = receta.insumo?.nombre || receta.insumo?.especificacion || '';
            } else {
                if (receta.medicamento?.esMagistral) {
                    nombre = receta.medicamento?.magistral?.nombre || receta.medicamento?.nombre || '';
                } else {
                    nombre = receta.medicamento?.nombre || receta.medicamento?.concepto?.term || '';
                }
            }

            let presentacion = '';
            if (esInsumo) {
                presentacion = receta.insumo?.tipo || receta.insumo?.unidades || '';
                if (receta.insumo?.especificacion) {
                    presentacion = receta.insumo.especificacion;
                }
            } else {
                const pres = receta.medicamento?.presentacion || '';
                const unidades = receta.medicamento?.unidades ? `${receta.medicamento.unidades} ` : '';
                presentacion = `${unidades}${pres}`.trim() || (pres || '');
                if (!presentacion && receta.medicamento?.presentacion) {
                    presentacion = receta.medicamento.presentacion;
                }
            }
            if (!presentacion) {
                presentacion = esInsumo ? (receta.insumo?.tipo || '-') : (receta.medicamento?.presentacion || '-');
            }

            let cantidad = '';
            if (esInsumo) {
                const cant = receta.insumo?.cantidad;
                const tipo = receta.insumo?.tipo || '';
                cantidad = cant ? `${cant} ${tipo}`.trim() : `${receta.insumo?.cantidad || ''}`.trim();
                if (!cantidad) { cantidad = '-'; }
                if (receta.insumo?.cantidad) {
                    cantidad = `${receta.insumo.cantidad} envase(s)`;
                    if (receta.insumo?.unidades) { cantidad += ` de ${receta.insumo.unidades}`; }
                }
            } else {
                const cantEnvases = receta.medicamento?.cantEnvases;
                const cantidadUni = receta.medicamento?.cantidad;
                const pres = receta.medicamento?.presentacion || 'comp';
                if (cantEnvases && cantidadUni) {
                    cantidad = `${cantEnvases} envase(s) de ${cantidadUni} ${pres}(s)`;
                } else if (cantEnvases) {
                    cantidad = `${cantEnvases} envase(s)`;
                } else {
                    cantidad = `${cantidadUni || ''} ${pres}`.trim() || '-';
                }
            }

            // Dosis diaria
            let dosisDiaria = '-';
            if (esInsumo) {
                dosisDiaria = receta.insumo?.especificacion || receta.diagnostico?.term || '-';

                if (receta.insumo?.cantidad) {
                    dosisDiaria = receta.insumo?.especificacion || '-';
                }
            } else {
                const dd = receta.medicamento?.dosisDiaria;
                if (dd && (dd.dosis || dd.intervalo || dd.dias)) {
                    const parts = [];
                    if (dd.dosis) { parts.push(`${dd.dosis}`); }
                    if (dd.intervalo?.nombre) { parts.push(`cada ${dd.intervalo.nombre}`); }
                    if (dd.dias) { parts.push(`durante ${dd.dias} día(s)`); }
                    dosisDiaria = parts.join(' ') || '-';

                    if (dd.dosis && dd.intervalo?.nombre && dd.dias) {
                        dosisDiaria = `${dd.dosis} cada ${dd.intervalo.nombre} durante ${dd.dias} día(s)`;
                    } else if (dd.dosis && dd.intervalo?.nombre) {
                        dosisDiaria = `${dd.dosis} cada ${dd.intervalo.nombre}`;
                    }
                } else {
                    dosisDiaria = '-';
                }
            }

            const diagnostico = receta.diagnostico?.term || receta.diagnostico?.descripcion || '-';
            const obraSocial = receta.paciente?.obraSocial?.financiador || receta.paciente?.obraSocial?.nombre || this.prestacion?.paciente?.obraSocial?.financiador || 'sin obra social';
            const notaMedica = !esInsumo ? (receta.medicamento?.dosisDiaria?.notaMedica || null) : (receta.insumo?.especificacion || null);
            const notaFinal = (!esInsumo && notaMedica) ? notaMedica : (esInsumo ? null : notaMedica);
            const estadoRaw = receta.estadoActual?.tipo || 'vigente';
            const estadoReceta = estadoRaw.charAt(0).toUpperCase() + estadoRaw.slice(1).replace('-', ' ');

            // Tratamiento prolongado
            const tratamientoProlongado = !esInsumo ? !!receta.medicamento?.tratamientoProlongado : !!receta.insumo?.tratamientoProlongado;
            const ordenTratamiento = !esInsumo ? ((receta.medicamento?.ordenTratamiento ?? 0) + 1) : ((receta.insumo?.ordenTratamiento ?? 0) + 1);
            const totalTratamiento = !esInsumo ? (receta.medicamento?.tiempoTratamiento?.id || receta.medicamento?.tiempoTratamiento?.nombre || '') : (receta.insumo?.tiempoTratamiento?.id || '');

            const esMagistral = !esInsumo ? !!receta.medicamento?.esMagistral : receta.insumo?.tipo === 'magistral';

            const idReceta = receta.idReceta || receta._id?.toString() || '';
            const barcodeSVG = idReceta ? generateBarcodeSVG(idReceta, 'code128') : '';

            // Firma y formación del profesional (por receta, igual que informe-rup firma)
            let firma = null;
            let detalle = null;
            let matriculas = null;
            try {
                const profData = receta.profesional;
                const prof = profData?._id || profData?.id ? await Profesional.findOne({ _id: profData.id || profData._id }) as any : await Profesional.findOne({ documento: profData?.documento }) as any;
                if (prof) {
                    firma = await this.getFirma(prof);
                    const mat = await this.getMatriculas(prof);
                    matriculas = mat;
                    detalle = prof.apellido + ', ' + prof.nombre;
                } else if (profData) {
                    detalle = (profData.apellido || '') + ', ' + (profData.nombre || '');
                }
            } catch (e) {
                // silencioso, sin firma
            }

            recetas.push({
                esInsumo,
                idReceta,
                barcodeSVG,
                fechaEmision,
                fechaVencimiento,
                estadoReceta,
                nombre,
                presentacion,
                cantidad,
                dosisDiaria,
                diagnostico,
                obraSocial,
                notaMedica: notaFinal,
                esMagistral,
                tratamientoProlongado,
                ordenTratamiento,
                totalTratamiento,
                firma,
                detalle,
                matriculas
            });
        }

        this.data = {
            recetas
        };
    }

    private async getFirma(profesional) {
        try {
            const FirmaSchema = makeFsFirma();
            const idProfesional = String(profesional.id || profesional._id);
            const file = await FirmaSchema.findOne({ 'metadata.idProfesional': idProfesional });
            if (file && file._id) {
                const stream = await FirmaSchema.readFile({ _id: file._id });
                const base64 = await streamToBase64(stream);
                return base64;
            }
        } catch (e) {}
        return null;
    }

    private async getMatriculas(profesional) {
        try {
            const info = await searchMatriculas(profesional.id || profesional._id);
            const grado = (info?.formacionGrado || []).map(e => `${e.nombre} MP ${e.numero}`);
            const posgrado = (info?.formacionPosgrado || []).map(e => `${e.nombre} ME ${e.numero}`);
            return [...grado, ...posgrado].join('<br>');
        } catch (e) {
            return null;
        }
    }
}
