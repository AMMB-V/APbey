# Propuesta para formatos, clasificación y conservación de resultados

**Decisión solicitada.** Aprobar las correcciones de avance y conservación de resultados, la clasificación suiza visible y las pruebas de aceptación. El formato híbrido requiere acordar cuántos pasan por cada corte antes de activar esa modalidad.

## Alcance de la revisión

Se revisaron los 88 mensajes de la exportación y el código de `main` en `cb888a3`. Los requisitos de APbey comienzan el 31 de octubre de 2026. Los mensajes de septiembre describen otro producto y se usaron para diseñar casos de regresión. El HTML enlaza 49 imágenes externas. Todas devolvieron HTTP 403, incluidas las seis del periodo actual. El primer mensaje del 31 de octubre contiene solo una imagen. Su contenido y los requisitos que dependan exclusivamente de las capturas quedan sin verificar.

## Requisitos de la aplicación actual

| Solicitud | Resultado | Evidencia y consecuencia |
|---|---|---|
| Una sola bolsa de participantes en suizo y sorteo aleatorio inicial | Cumple en la ruta de creación suiza | El generador mezcla a los participantes elegibles e inicia una ronda para toda la etapa. La suite comprueba sorteo y número impar. |
| A partir de la segunda ronda, priorizar rivales con resultados similares del torneo del día | Cumple con la configuración suiza inicial | El emparejamiento usa los puntos de la etapa, busca rivales cercanos y evita repeticiones cuando encuentra una combinación válida. Hay una prueba de ganadores contra ganadores. |
| Bye como una victoria y un punto, sin rival ficticio en Buchholz | Cumple en el suizo inicial. Parcial para un suizo final | La creación suiza inicial configura victoria y bye en 1. El formulario de segunda etapa suiza guarda los desempates pero omite la puntuación. Con esa configuración sin editar, el motor usa 3 por victoria y 1 por bye. |
| Buchholz medio, directo y diferencia después del resultado principal | Cumple en el motor con el orden suizo. Visibilidad parcial | El ejemplo de rivales 1, 4, 2, 3, 4 da **9**. Se descarta una ocurrencia de cada extremo. Con menos de tres rivales el motor suma los disponibles, criterio no especificado en la conversación. La vista suiza muestra rondas bajo «Cuadro Eliminatorio Oficial» y carece de una tabla suiza equivalente a la de grupos para justificar el corte. |
| Elegir una o dos etapas, habitualmente dos | Parcial. La transición puede contradecir la selección | Con grupos y un suizo final preconfigurado, avanzar creó una eliminación directa adicional en la misma posición. También aceptó avanzar con un cruce pendiente. En la vista de grupos el botón depende de que la etapa esté en curso, incluso cuando se eligió una sola etapa. |
| Híbrido con grupos todos contra todos, ronda extra de eliminación directa y cierre suizo | Falta el recorrido completo | Hay componentes para los tres formatos. La transición crea un cuadro eliminatorio completo y carece de una entrega automática de los supervivientes de una sola ronda al suizo final. La generación ordinaria de una etapa parte de los inscritos elegibles del torneo. |
| Añadir y eliminar sets | Cumple en el modal probado | En un mejor de uno con 1–1 añadimos, quitamos y volvimos a añadir el desempate. Antes de confirmar hubo cero envíos. Al confirmar se enviaron exactamente 1–1 y 4–0. En mejor de tres la suite acepta un 2–0 y rechaza declarar ganador con un único set ganado. |

Fuentes del flujo actual: [creación y puntuación](../src/components/tournament/TournamentList.tsx#L155), [sorteo y emparejamiento](../src/lib/engine/formats/swiss.ts#L32), [cálculo de clasificación](../src/lib/engine/tiebreakers.ts#L53), [transición](../src/context/tournament/TournamentContext.tsx#L1902), [desempates del ejemplo](../src/lib/engine/tiebreakers.test.ts#L123), [modal](../src/components/referee/MatchSetReport.tsx#L92), [vistas por formato](../src/App.tsx#L623).

## Regresiones que conviene rescatar de septiembre

| Caso histórico | Qué ocurre en APbey |
|---|---|
| Clasificados antes de jugar | **Reproducido.** Cuatro inscritos, dos plazas y ningún resultado produjeron dos etiquetas «Clasifica». El motor asigna el indicador por posición y la vista lo muestra desde el inicio. |
| Mover un jugador altera los grupos o el historial | **Reproducida la pérdida de historial.** Al mover un cuarto jugador ajeno al combate ya terminado entre A y B, los grupos quedaron en 3 y 1, pero desapareció aquel resultado. Se regeneraron tres encuentros pendientes. El selector está disponible para organizadores con la etapa en curso. |
| Alta masiva, bajas, grupos desiguales y grupos extra | Hay alta masiva y el ejemplo 3/1 conservó las pertenencias esperadas. La subdivisión usa tamaño objetivo. Quedan por validar altas tardías, bajas, creación de un grupo vacío y conservación del calendario al recargar. |
| Siguiente combate del grupo, luego ayuda a otro grupo | Parcial. El marcador busca en la misma mesa y comprueba asignaciones. Un grupo repartido entre mesas puede tener pendientes fuera de esa cola. Los nombres se obtienen del combate seleccionado. Parpadeos, bloqueos y nombres repetidos antiguos siguen sin reproducción en una sesión real con dos árbitros. |
| Reglas editables, lenguaje de tabla y al mejor de tres a cuatro puntos | El asistente permite ordenar criterios y configurar puntos. La tabla incluye medidas adicionales como promedio y puntos. El umbral de playoffs es configurable y la creación parte de 5, distinto del ejemplo histórico de 4. |
| Perfil, combos frecuentes y creación inspirada en Challonge | El perfil muestra avatar y el editor de cuenta ofrece nombre, correo y contraseña. La inscripción acepta combos escritos. El catálogo compartido de combos y la edición de biografía quedan como ideas históricas, fuera del alcance propuesto para torneos. |

Fuentes: [clasificados y traslado](../src/components/bracket/GroupStageViewer.tsx#L320), [regeneración de encuentros](../src/context/tournament/TournamentContext.tsx#L2834), [cola de mesa](../src/components/scoreboard/ScoreboardView.tsx#L151), [alta masiva](../src/components/participants/ParticipantManager.tsx#L67).

## Orden de implementación y aceptación

1. **Proteger el resultado oficial.** El organizador solo podrá cerrar grupos al resolver todos los cruces necesarios. Un torneo de una etapa finalizará ahí. Uno de dos reutilizará la etapa prevista y sus reglas. Reintentar o recargar deberá conservar un único destino, los mismos clasificados y resultados. Un traslado con combates jugados deberá preservar el historial o bloquearse antes de modificarlo.
2. **Hacer comprobable el corte suizo.** Mostrar por ronda victorias, puntos, Buchholz medio, directo cuando aplique y diferencia. Distinguir posición provisional de clasificación definitiva. Aplicar los mismos valores iniciales de puntuación en el suizo inicial y final respetando las reglas personalizadas guardadas. Validar un bye, un empate múltiple y el ejemplo de Buchholz que da 9.
3. **Acordar el híbrido.** Fijar cuántos salen de cada grupo, qué jugadores disputan el cruce adicional y cuántas rondas tiene el suizo final. Probar con nombres rastreables que cada superviviente entra exactamente una vez, que los eliminados quedan fuera y que el cuadro sigue igual tras recargar.
4. **Ensayar con dos árbitros en staging.** Completar un torneo con grupos desiguales, cambio de mesa, combate empatado, desempate y semifinales. Comparar marcador, sets persistidos, tabla y siguiente combate desde dos sesiones. Evaluar por separado si se adopta la preferencia histórica de seguir al grupo entre mesas.

## Verificación realizada

- Pasaron las 64 pruebas existentes en 12 archivos con `npm test`. Se simularon además cinco rondas suizas completas con 15, 16 y 32 participantes sintéticos.
- En Chromium local se montaron el proveedor de torneos, la tabla de grupos y el modal del commit auditado. La prueba de transición invocó la misma acción que el botón del organizador. La prueba del modal usó sus controles visibles y registró los argumentos enviados al confirmar.
- La persistencia remota y la concurrencia de árbitros requieren el ensayo de staging. Las pruebas locales usaron datos ficticios. Esta propuesta solicita aprobación para implementar y verificar los cambios descritos.
