import { HTMLComponent } from '../../model/html-component.class';

export class ProcedimientoDeEnfermeriaComponent extends HTMLComponent {
    template = `
        <div class="nivel-1">
            <p>
                {{ registro.concepto.term }}
                {{#if registro.esDiagnosticoPrincipal}}<small>(PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL)</small>{{/if}}
                <p>&emsp;Procedimientos ejecutados:
                    {{#each valor.prestaciones}}
                        <small class="subregistro">
                           <p>&emsp;&emsp;{{ this }}
                        </small>
                    {{/each}}
                
                    <p>&emsp;Tiempos empleados:
                {{#each valor.tiemposEmpleados}}
                    <small class="subregistro">
                        <p>&emsp;&emsp;{{ this.[0]}}: {{ this.[1] }} minutos
                    </small>
                {{/each}}
           
    `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const prestaciones = [];
        const tiemposEmpleados = [];
        for (const key in this.registro?.valor?.prestacionesRealizadas) {
            if (this.registro?.valor?.prestacionesRealizadas.hasOwnProperty(key) && this.registro?.valor?.prestacionesRealizadas[key] === true) {
                switch (key) {
                    case 'sondaNasogastrica': prestaciones.push('Colocación de sonda nasogástrica'); break;
                    case 'banioAntitermico': prestaciones.push('Baño Antitérmico'); break;
                    case 'viaPeriferica': prestaciones.push('Colocación de vía periferica'); break;
                    case 'aspiracionSecreciones': prestaciones.push('Aspiración de Secreciones'); break;
                    case 'CLCF': prestaciones.push('Control de latidos Cardio fetales'); break;
                    case 'basiloscopia': prestaciones.push('Toma de muestra para basiloscopía'); break;
                    case 'confeccionCarnet': prestaciones.push('Confección de carnet de vacunas'); break;
                    case 'saludEscolar': prestaciones.push('Cuidado de enfermería en salud escolar'); break;
                    case 'tomaMuesra': prestaciones.push('Toma de muestra'); break;
                    case 'dinamicaUterina': prestaciones.push('Control de la Dinámica Uterina'); break;
                    case 'electrocardiograma': prestaciones.push('Electrocardiograma'); break;
                    case 'entregaLeche': prestaciones.push('Entrega de leche'); break;
                    case 'enemaEvacuante': prestaciones.push('Enema Evacuante'); break;
                    case 'extraccionSuturas': prestaciones.push('Extracción de suturas'); break;
                    case 'gestionInsumos': prestaciones.push('Gestión de Insumos'); break;
                    case 'impregnacion': prestaciones.push('Impregnación'); break;
                    case 'instilacionOcular': prestaciones.push('Instilación Ocular'); break;
                    case 'lavajeGastrico': prestaciones.push('Lavaje Gástrico'); break;
                    case 'monitoreoCardiaco': prestaciones.push('Monitoreo Cardíaco'); break;
                    case 'nebulizaciones': prestaciones.push('Nebulizaciones'); break;
                    case 'rcp': prestaciones.push('Reanimación Cardio Pulmonar'); break;
                    case 'recap': prestaciones.push('RECAP'); break;
                    case 'rehidratacion': prestaciones.push('Rehidratación Oral'); break;
                    case 'vendaje': prestaciones.push('Vendaje'); break;
                    case 'virologo': prestaciones.push('Toma de muestra para virológico'); break;
                    case 'sondaVesical': prestaciones.push('Colocación de Sonda Vesical'); break;
                    case 'curacionSimple': prestaciones.push('Curación Simple'); break;
                    case 'curacionCompleja': prestaciones.push('Curación Compleja'); break;
                    case 'curacionQuemadura': prestaciones.push('Curación Quemadura'); break;
                    default: prestaciones.push('falta cargar');
                }
            }
        }


        for (const key in this.registro?.valor?.tiemposEmpleados) {
            if (this.registro?.valor?.tiemposEmpleados.hasOwnProperty(key) && this.registro?.valor?.tiemposEmpleados[key] > 0) {
                switch (key) {
                    case 'asistenciaPracticas': tiemposEmpleados.push(['Asistencia a prácticas médicas', this.registro?.valor?.tiemposEmpleados[key]]); break;
                    case 'atencionDomiciliaria': tiemposEmpleados.push(['Atención Domiciliaria', this.registro?.valor?.tiemposEmpleados[key]]); break;
                    case 'charlaEducativa': tiemposEmpleados.push(['Charla Educativa', this.registro?.valor?.tiemposEmpleados[key]]); break;
                    case 'derivaciones': tiemposEmpleados.push(['Derivaciones', this.registro?.valor?.tiemposEmpleados[key]]); break;
                    case 'atencionPrehospitalaria': tiemposEmpleados.push(['Atención pre Hospitalaria', this.registro?.valor?.tiemposEmpleados[key]]); break;
                    case 'contencionEmocional': tiemposEmpleados.push(['Contención Emocional', this.registro?.valor?.tiemposEmpleados[key]]); break;
                    default: tiemposEmpleados.push('falta cargar');
                }
            }
        }
        this.data = {
            registro: this.registro,
            valor: {
                prestaciones,
                tiemposEmpleados
            }
        };
    }

}
