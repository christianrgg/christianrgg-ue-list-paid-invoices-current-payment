/**
 * Enlista las facturas pagadas del pago actual en un campo personalizado.
 * @NModuleScope Public
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NAuthor Grupo Sol4IT
 * */

define(['N/record', 'N/log'], 
function (record, log) {

    const FIELD_ID_FACTURAS = 'custbody_s4_apply_transaccition';

    const afterSubmit = (scriptContext) => {

        log.audit('INICIAMOS', `Ejecutando afterSubmit en tipo: ${scriptContext.type}`);

        const validEvents = [
            scriptContext.UserEventType.CREATE,
            scriptContext.UserEventType.EDIT,
            scriptContext.UserEventType.XEDIT
        ];

        if (!validEvents.includes(scriptContext.type)) {
            log.debug('Evento no válido', `Tipo: ${scriptContext.type} - No se ejecutará el script.`);
            return;
        }

        try {
            // El registro se lee directamente de scriptContext.newRecord (que es de solo lectura)
            const currentRecord = scriptContext.newRecord;
            const sublistId = 'apply';
            const numLines = currentRecord.getLineCount({ sublistId }); // ⬅️ CORRECCIÓN: Usar currentRecord
            let facturasConcatenadas = [];

            log.debug('INFO', `Número de líneas en la sublista "apply": ${numLines}`);

            for (let i = 0; i < numLines; i++) {
                // ⬅️ CORRECCIÓN: Usar currentRecord para getSublistValue
                const isApplied = currentRecord.getSublistValue({ sublistId, fieldId: 'apply', line: i });

                if (isApplied) {
                    const tranType = currentRecord.getSublistValue({ sublistId, fieldId: 'trantype', line: i });
                    const refNum = currentRecord.getSublistValue({ sublistId, fieldId: 'refnum', line: i });

                    if (tranType === 'CustInvc' && refNum) {
                        facturasConcatenadas.push(refNum);
                        log.debug('Línea procesada', `Línea ${i + 1}: ${refNum}`);
                    }
                }
            }
            
            const nuevoValor = facturasConcatenadas.join(', ') || '';
            const valorActual = currentRecord.getValue({ fieldId: FIELD_ID_FACTURAS }); // ⬅️ CORRECCIÓN: Usar currentRecord

            log.debug('Comparación de valores', `Actual: "${valorActual}" | Nuevo: "${nuevoValor}"`);

            // La lógica de submitFields es CORRECTA para afterSubmit.
            if (nuevoValor !== valorActual) {
            
                record.submitFields({
                    type: currentRecord.type,
                    id: currentRecord.id,
                    values: {
                        [FIELD_ID_FACTURAS]: nuevoValor
                    },
                    options: {
                        enablesourcing: false, 
                        ignoreMandatoryFields: true 
                    }
                });

                log.audit('ACTUALIZADO', `Campo ${FIELD_ID_FACTURAS} actualizado a: ${nuevoValor}`);
            } else {
                log.debug('SIN CAMBIOS', 'El valor del campo ya estaba actualizado, no se guarda el registro.');
            }

            log.audit('FINALIZADO', 'Ejecución del script completada correctamente.');

        } catch (error) {
            
            let lineNumber = 'No disponible';
            if (error && error.stack) {
                const match = error.stack.match(/:(\d+):\d+\)?$/m);
                if (match && match[1]) {
                    lineNumber = match[1];
                }
            }

            log.error('ERROR EN afterSubmit', {
                mensaje: error.message || error.toString(),
                linea: lineNumber,
                pila: error.stack || 'Sin stack disponible'
            });
        }
    }
        
    return {
        afterSubmit
    }
}
);