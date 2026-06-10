import pg from 'pg';

async function main() {
  const adminClient = new pg.Client('postgresql://postgres:postgres@localhost:5432/postgres');
  try {
    await adminClient.connect();
    
    // Terminate active connections to the database to allow dropping it
    await adminClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'windowworldsandbox'
        AND pid <> pg_backend_pid();
    `);
    
    await adminClient.query('DROP DATABASE IF EXISTS windowworldsandbox;');
    await adminClient.query('CREATE DATABASE windowworldsandbox;');
    console.log("Database 'windowworldsandbox' dropped and recreated.");

    // Create Supabase roles if they do not exist
    await adminClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role;
        END IF;
      END
      $$;
    `);
    console.log("Supabase roles checked/created.");
  } catch (e: any) {
    console.error("Failed to reset database:", e.message);
    return;
  } finally {
    await adminClient.end();
  }

  const client = new pg.Client('postgresql://postgres:postgres@localhost:5432/windowworldsandbox');
  try {
    await client.connect();
    
    // Create schemas
    await client.query('CREATE SCHEMA IF NOT EXISTS auth;');
    await client.query('CREATE SCHEMA IF NOT EXISTS storage;');
    console.log("Schemas 'auth' and 'storage' created.");

    // Create mock functions in auth schema - returning text for uid to avoid text=uuid operators mismatch
    await client.query(`
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$
        SELECT '{}'::jsonb;
      $$ LANGUAGE sql STABLE;

      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
        SELECT 'anon'::text;
      $$ LANGUAGE sql STABLE;

      CREATE OR REPLACE FUNCTION auth.uid() RETURNS text AS $$
        SELECT '00000000-0000-0000-0000-000000000000'::text;
      $$ LANGUAGE sql STABLE;

      CREATE OR REPLACE FUNCTION auth.email() RETURNS text AS $$
        SELECT ''::text;
      $$ LANGUAGE sql STABLE;
    `);
    console.log("Mock auth functions created.");

    // Create storage tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS storage.buckets (
        id text PRIMARY KEY,
        name text NOT NULL,
        owner text,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        public boolean DEFAULT false,
        file_size_limit bigint,
        allowed_mime_types text[]
      );

      CREATE TABLE IF NOT EXISTS storage.objects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id text REFERENCES storage.buckets(id),
        name text,
        owner text,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        last_accessed_at timestamp with time zone DEFAULT now(),
        metadata jsonb,
        path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
      );
    `);
    console.log("Mock storage tables created.");

    // Create storage.foldername function
    await client.query(`
      CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] AS $$
        SELECT string_to_array(name, '/');
      $$ LANGUAGE sql STABLE;
    `);
    console.log("Mock storage.foldername function created.");

  } catch (e: any) {
    console.error("Failed to mock Supabase environment in database:", e.message);
  } finally {
    await client.end();
  }
}

main();
