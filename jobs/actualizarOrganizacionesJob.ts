import { actualizarOfertasPrestacionales } from './actualizarOrganizaciones';
import { actualizarContacto } from './actualizarOrganizaciones';

async function run(done) {
    await actualizarOfertasPrestacionales();
    await actualizarContacto();
    done();
}

export = run;
