const { createLogger, format, transports } = require("winston");
const path = require('path');
const util = require('util');
const { addColors } = require("winston/lib/winston/config")
const dateformat = require('date-format');


//-----------------------------logget file---------------------------------------------------------------------
const formatter = format.printf((options) => {
    return `[${options.level}]\t[${options.label}]\t[${dateformat.asString('hh:mm:ss',new Date(options.timestamp))}\t${options.message}]`
})
function createModulerLogger(moduleName){
    return createLogger({
        transports: [
            new transports.File({
                filename: path.join('./', process.env.LOGGER_DIR || 'logs', process.env.LOG_FILENAME || 'Explorer_Apis'),
                format: format.combine(
                    format.timestamp(),
                    format.label({ label: moduleName }),
                    formatter


                )
            }),
            new transports.Console({ 
                level: 'debug',
                format: format.combine(
                    format.timestamp(),
                    format.label({ label: moduleName }),
                    format.prettyPrint(),
                    format.splat(),
                    format.simple(),
                    formatter,



                )


            })
        ]
    })


}
module.exports.createModulerLogger = createModulerLogger;