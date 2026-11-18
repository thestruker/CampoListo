-- Alta de la primera empresa y su administrador.
-- 1) Crea el usuario en Authentication → Users (con correo y contraseña).
-- 2) Copia su UUID y ejecuta esto en el SQL Editor cambiando los valores:
with e as (
  insert into empresas (nombre, razon_social, telefono, correo, direccion)
  values ('Mi empresa', 'Mi empresa S.A. de C.V.', '637 000 0000', 'contacto@miempresa.mx', 'Caborca, Sonora')
  returning id
)
insert into usuarios (id, empresa_id, nombre, correo, rol)
select 'UUID-DEL-USUARIO-ADMIN', id, 'Nombre del dueño', 'correo@del.dueño', 'administrador' from e;
