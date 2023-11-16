import { vencimientoPrestacion } from './../modules/rup/controllers/prestacion';
async function run(done) {
    await vencimientoPrestacion(done);
}
export = run;
