\set ON_ERROR_STOP on

-- Required psql variables:
--   migration_role: owner used only by the deployment migration job
--   runtime_role: application account
--   backup_role: read-only backup account
--
-- Roles and passwords must be provisioned by the approved secret/DB platform.
-- Do not place passwords in this file.

GRANT CONNECT ON DATABASE :"DBNAME" TO :"migration_role", :"runtime_role", :"backup_role";

GRANT USAGE ON SCHEMA public TO :"runtime_role", :"backup_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"runtime_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"runtime_role";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"backup_role";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO :"backup_role";

ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_role" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"runtime_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_role" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"runtime_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_role" IN SCHEMA public
  GRANT SELECT ON TABLES TO :"backup_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_role" IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO :"backup_role";
