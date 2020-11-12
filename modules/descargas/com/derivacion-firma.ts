import { HTMLComponent } from '../model/html-component.class';
import { makeFsFirma } from '../../../core/tm/schemas/firmaProf';
import { streamToBase64 } from '../../../core/tm/controller/file-storage';
import { searchMatriculas } from '../../../core/tm/controller/profesional';
import * as mongoose from 'mongoose';
import { Profesional } from '../../../core/tm/schemas/profesional';

export class DerivacionFirma extends HTMLComponent {
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
                    {{{ matriculas }}}
                </h6>
                <h6 class="subdata-italic"> </h6>
            </div>
        </span>
    </footer>
    `;

    constructor(public derivacion) {
        super();
    }

    async process() {
        const elementoHistorial = this.derivacion.historial.find(elemento => elemento.estado === 'finalizada');
        const profesional: any = await Profesional.findOne({ documento: elementoHistorial.createdBy.documento });
        const imagenFirma = await this.getFirma(profesional);
        const matriculas = await this.getMatriculas(profesional);
        const detalle = profesional.apellido + ', ' + profesional.nombre;

        this.data = {
            firma: imagenFirma,
            detalle,
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

    private async getMatriculas(profesional) {
        const infoMatriculas = await searchMatriculas(mongoose.Types.ObjectId(profesional.id));
        const grado = infoMatriculas.formacionGrado.map(e => `${e.nombre} MP ${e.numero}`);
        const posgrado = infoMatriculas.formacionPosgrado.map(e => `${e.nombre} ME ${e.numero}`);

        return [...grado, ...posgrado].join('<br>');
    }
}
