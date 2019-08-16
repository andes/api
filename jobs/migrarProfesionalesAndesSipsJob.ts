import * as profesionalCtrl from './../core/tm/controller/profesional';

/* Actualiza la tabla de profesionales de SIPS con los nuevos profesionales
    registrados en Mongo durante el último día
*/
function run(done) {
    profesionalCtrl.migrarASips().then(done).catch(done);
}
export = run;

