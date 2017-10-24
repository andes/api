import * as roboSender from '../utils/roboSender/roboSender';

function run() {
    roboSender.roboSender().then(() => {}, () => {});
}

export = run;
