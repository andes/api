import { HTMLComponent } from '../model/html-component.class';
import { makeFsFirma } from '../../../core/tm/schemas/firmaProf';
import { streamToBase64 } from '../../../core/tm/controller/file-storage';
import { searchMatriculas } from '../../../core/tm/controller/profesional';
import { Profesional } from '../../../core/tm/schemas/profesional';

export class InformeRupFirma extends HTMLComponent {
    template = `
        <footer id="last">
        <!-- Firmas -->
        <span class="contenedor-firmas">
            <div class="contenedor-bloque-texto">
                {{#if firma}}
                    <img src="data:image/png;base64,{{{firma}}}">
                {{/if}}
                <hr class="lg">
                <h6 class="bolder">
                    {{ detalle }} <br>
                    {{ detalle2 }} <br>
                    {{{ matriculas }}}
                </h6>
                <h6 class="subdata-italic"> </h6>
            </div>
        </span>
    </footer>
    `;

    constructor(public profesional, public organizacion) {
        super();
    }

    async process() {
        this.profesional = (this.profesional._id) ? await Profesional.findOne({ _id: this.profesional._id }) : await Profesional.findOne({ documento: this.profesional.documento });
        const imagenFirma = await this.getFirma(this.profesional);
        const matriculas = await this.getMatriculas();

        const detalle = this.profesional.apellido + ', ' + this.profesional.nombre;
        const detalle2 = this.organizacion.nombre.substring(0, this.organizacion.nombre.indexOf('-'));

        this.data = {
            firma: imagenFirma,
            detalle,
            detalle2,
            matriculas
        };
    }

    private async getFirma(profesional) {
        const FirmaSchema = makeFsFirma();
        const idProfesional = String(profesional.id);
        const file = await FirmaSchema.findOne({ 'metadata.idProfesional': idProfesional });
        if (file && file._id) {
            const stream = await FirmaSchema.readFile({ _id: file._id });
            const base64 = await streamToBase64(stream);
            return base64;
        }
        return null;
    }

    private async getMatriculas() {
        const infoMatriculas = await searchMatriculas(this.profesional.id);

        const grado = infoMatriculas.formacionGrado.map(e => `${e.nombre} MP ${e.numero}`);
        const posgrado = infoMatriculas.formacionPosgrado.map(e => `${e.nombre} ME ${e.numero}`);

        return [...grado, ...posgrado].join('<br>');

    }
}
