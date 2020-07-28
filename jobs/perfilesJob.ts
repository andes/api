import { actualizarPerfiles } from '../utils/scriptsMongo/actualizarPerfiles';

function run(done) {
    actualizarPerfiles(done);
}

export = run;
