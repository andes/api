"use strict";
var ValidateFormatDate = (function () {
    function ValidateFormatDate() {
    }
    ValidateFormatDate.validateDate = function (date) {
        var RegExPattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
        if ((date.match(RegExPattern)) && (date != '')) {
            return true;
        }
        else {
            return false;
        }
    };
    ValidateFormatDate.obtenerFecha = function (fechaStr) {
        var numbers = fechaStr.match(/\d+/g);
        var date = new Date(numbers[2], numbers[1] - 1, numbers[0]);
        return date;
    };
    return ValidateFormatDate;
}());
exports.ValidateFormatDate = ValidateFormatDate;
//# sourceMappingURL=validateFormatDate.js.map