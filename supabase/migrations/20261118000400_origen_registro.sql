-- Entrevista 3: la hora no debe depender de acordarse de un botón.
-- Se guarda qué generó cada registro: el botón, la primera evidencia, la firma del cliente o "Terminé".
alter table registros_tiempo add column origen text not null default 'boton'
  check (origen in ('boton', 'evidencia', 'firma', 'terminar'));
