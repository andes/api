import * as FormularioTerapeutico from '../core/tm/schemas/formularioTerapeutico';
import { Auth } from '../auth/auth.class';
import { userScheduler } from '../config.private';

const medicamentos = require('./formulario_terapeutico_json_data/ftp-2025.json');

const filtroFTP = { 'sistema.id': { $exists: true } };

async function run(done) {
    try {
        const reemplazar = process.argv.includes('--reemplazar');
        const existentes = await FormularioTerapeutico.countDocuments(filtroFTP);

        if (existentes && !reemplazar) {
            // eslint-disable-next-line no-console
            console.log(`Ya hay ${existentes} medicamentos del FTP cargados. Para volver a cargarlos usar --reemplazar`);
            return done();
        }
        if (existentes) {
            const { deletedCount } = await FormularioTerapeutico.deleteMany(filtroFTP);
            // eslint-disable-next-line no-console
            console.log(`Se borraron ${deletedCount} medicamentos del FTP`);
        }

        let cargados = 0;
        for (const medicamento of medicamentos) {
            const documento: any = new FormularioTerapeutico({
                ...medicamento,
                conceptId: medicamento.concepto?.conceptId
            });
            Auth.audit(documento, userScheduler as any);
            await documento.save();
            cargados++;
        }
        // eslint-disable-next-line no-console
        console.log(`Se cargaron ${cargados} de ${medicamentos.length} medicamentos del FTP`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error cargando el FTP:', error);
    }
    done();
}

export = run;
