import { Types } from 'mongoose';
import { InformePDF, getAssetsURL } from '../model/informe.class';
import { Prestacion } from '../../rup/schemas/prestacion';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { InformeRupHeader } from '../informe-rup/informe-header';
import { InformeRupFooter } from '../informe-rup/informe-footer';
import { RecetasBody } from './recetas-body';
import { elementosRUPAsSet, fulfillPrestacion } from '../../rup/controllers/elementos-rup.controller';
import { findByPaciente } from '../../rup/internacion/camas.controller';
import { findById } from '../../../core-v2/mpi/paciente/paciente.controller';
import { Receta } from '../../recetas/receta-schema';
import { RecetaInsumo } from '../../recetas/recetasInsumos/receta-insumo.schema';

export class InformeRecetas extends InformePDF {

    constructor(private prestacionId: string | Types.ObjectId, private registroId: string | Types.ObjectId = null, private usuario: any, private snapshots: any = null, private recetasIds: string[] = null) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/rup/informes/sass/main.scss')
    ];

    public async process() {
        const prestacion: any = await Prestacion.findById(this.prestacionId);

        if (!prestacion) {
            throw new Error('Prestación no encontrada');
        }

        if (this.snapshots) {
            prestacion.ejecucion.registros.forEach(r => {
                if (this.snapshots[r.id]) {
                    r.valor = r.valor || {};
                    r.valor.snapshot = this.snapshots[r.id];
                }
            });
        }

        const paciente = await findById(prestacion.paciente.id);
        const organizacion = await Organizacion.findById(prestacion.ejecucion.organizacion.id);
        const elementosRUPSet = await elementosRUPAsSet();

        await fulfillPrestacion(prestacion, elementosRUPSet);

        const cama = await this.getCamaInternacion(prestacion);

        // Obtener recetas asociadas
        const recetas = await this.getRecetas(prestacion);

        this.header = new InformeRupHeader(prestacion, paciente, organizacion, cama);
        this.body = new RecetasBody(prestacion, paciente, organizacion, recetas, this.registroId ? String(this.registroId) : null);
        this.footer = new InformeRupFooter(prestacion, paciente, organizacion, this.usuario);

        await super.process();
    }

    private async getRecetas(prestacion: any) {
        if (this.recetasIds && this.recetasIds.length) {
            const ids = this.recetasIds.map(id => Types.ObjectId(id));
            const [medicamentos, insumos] = await Promise.all([
                Receta.find({ _id: { $in: ids } }).sort({ fechaRegistro: 1 }),
                RecetaInsumo.find({ _id: { $in: ids } }).sort({ fechaRegistro: 1 })
            ]);
            const all: any[] = [...medicamentos, ...insumos].sort((a: any, b: any) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime());
            return all;
        }

        const queryBase: any = {
            idPrestacion: prestacion._id.toString()
        };
        if (this.registroId) {
            queryBase.idRegistro = String(this.registroId);
        }

        const [recetasMed, recetasInsumo] = await Promise.all([
            Receta.find(queryBase).sort({ fechaRegistro: 1 }),
            RecetaInsumo.find(queryBase).sort({ fechaRegistro: 1 })
        ]);

        let todas: any[] = [...recetasMed, ...recetasInsumo];

        if (!this.registroId && todas.length > 1) {
            const vigentesPendientes = todas.filter(receta =>
                ['vigente', 'pendiente'].includes(receta.estadoActual?.tipo)
            );
            // Si hay al menos una vigente/pendiente, mostramos solo esas; sino mostramos todas (ej vencidas)
            if (vigentesPendientes.length > 0) {
                todas = vigentesPendientes;
            }
        }

        // Ordenar por fechaRegistro y por ordenTratamiento si existe
        todas.sort((a: any, b: any) => {
            const fechaA = new Date(a.fechaRegistro).getTime();
            const fechaB = new Date(b.fechaRegistro).getTime();
            if (fechaA !== fechaB) { return fechaA - fechaB; }
            const ordenA = a.medicamento?.ordenTratamiento ?? a.insumo?.ordenTratamiento ?? 0;
            const ordenB = b.medicamento?.ordenTratamiento ?? b.insumo?.ordenTratamiento ?? 0;
            return ordenA - ordenB;
        });

        return todas;
    }

    async getCamaInternacion(prestacion) {
        if (prestacion.solicitud.ambitoOrigen === 'internacion') {
            const org = prestacion.solicitud.organizacion;
            const cama: any = await findByPaciente(
                { organizacion: org, capa: 'medica', ambito: 'internacion' },
                prestacion.paciente.id,
                prestacion.ejecucion.fecha
            );
            if (cama) {
                const sectores = cama.sectores || [];
                cama.sectorName = [...sectores].reverse().map(s => s.nombre).join(', ');
                return cama;
            }
        }
        return null;
    }
}
