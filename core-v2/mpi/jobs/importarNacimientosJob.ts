import { importarNacimientos, importarDocumentosAsignados } from './nacimientosProcess';

async function run(done) {
    await importarNacimientos();
    await importarDocumentosAsignados();
    done();
}

export = run;
