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
    ValidateFormatDate.convertirFecha = function (fecha) {
        //console.log(fecha,typeof(fecha));
        if (fecha) {
            if (typeof (fecha) != "string") {
                var fecha1 = new Date(fecha);
                return ((fecha1.toISOString()).substring(0, 10));
            }
            else
                return ((fecha.toString()).substring(0, 10));
        }
        else {
            return "";
        }
    };
    return ValidateFormatDate;
}());
exports.ValidateFormatDate = ValidateFormatDate;
//# sourceMappingURL=validateFormatDate.js.map