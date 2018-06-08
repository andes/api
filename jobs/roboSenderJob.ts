import * as roboSender from '../utils/roboSender/roboSender';

function run() {
    roboSender.roboSender().then(() => {
        process.exit();
    }, () => {
        process.exit();
    });
}

export = run;
