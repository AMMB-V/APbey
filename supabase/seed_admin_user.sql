-- =====================================================================
-- APbey Arena - Promover Primer Usuario a Administrador
-- =====================================================================
-- Instrucciones:
-- 1. Registra tu cuenta en la aplicación web o directamente en Supabase Auth
--    (Authentication -> Users -> Add User).
-- 2. Una vez registrado, ejecuta la siguiente sentencia reemplazando el correo
--    o el ID de usuario.

-- Opción A: Por correo electrónico (vinculado con auth.users)
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'tu_correo_admin@ejemplo.com'
);

-- Opción B: Por UUID directo del usuario (si conoces el user_id de Auth)
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = '00000000-0000-0000-0000-000000000000';

-- Verificación de la asignación:
SELECT p.id, u.email, p.display_name, p.role, p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin';
