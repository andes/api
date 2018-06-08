import * as roboSender from '../utils/roboSender/roboSender';

function run(done) {
    roboSender.roboSender().then(() => {
        done();
    }, () => {
        done();
    });
}

export = run;
