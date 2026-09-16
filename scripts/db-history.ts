/**
 * 마이그레이션 히스토리·스키마 도구 (Week 68 — 환경 분리).
 *
 * 레포 `supabase/migrations/`는 0016부터라 새 환경을 파일만으로 재현할 수 없다. 대신 원격
 * `supabase_migrations.schema_migrations`에 MCP `apply_migration`이 남긴 statements 전문이
 * 0001부터 전부 있어, 그것을 레포에 저장(`export`)하고 새 프로젝트에 순서대로 재생(`replay`)한다.
 * 재생 뒤에는 두 프로젝트의 정의(함수·정책·컬럼·제약·트리거·인덱스·권한·버킷)를 같은 질의로
 * 뽑아(`snapshot`) diff한다 — 히스토리 밖에서 `execute_sql`로만 넣은 정의(드리프트)를 잡는 자리.
 *
 * 실행: npx tsx scripts/db-history.ts <export|replay|snapshot> [--env DATABASE_URL|SUPABASE_PROD_DB_URL] [--out 경로]
 *   export   — 히스토리를 supabase/history/<version>_<name>.sql로 저장 (기본 env: DATABASE_URL = dev)
 *   replay   — supabase/history/*.sql을 순서대로 실행하고 schema_migrations에 같은 version·name으로 기록
 *              (⚠ 대상은 반드시 --env SUPABASE_PROD_DB_URL 같은 **빈 프로젝트**. 이미 히스토리가 있으면 거부)
 *   snapshot — 정의 스냅샷을 --out 파일로 저장(두 환경에서 각각 돌려 diff)
 * 필요 env(.env.local): 연결 문자열 — 대시보드 [Connect]의 Direct URI를 그대로 넣으면 pooler로 바꿔 붙는다(toPoolerUrl). 앱 코드는 이 값을 읽지 않는다 — 스크립트 전용.
 *   pooler 클러스터는 프로젝트마다 다르다(dev aws-1 · prod aws-0) — 맞지 않으면 `SUPABASE_POOLER_HOST=aws-0-ap-northeast-2.pooler.supabase.com`으로 덮는다.
 */
import { config } from 'dotenv'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

config({ path: '.env.local' })

const HISTORY_DIR = path.resolve('supabase/history')
const HEADER = (version: string, name: string) =>
    `-- ${version} ${name}\n-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16\n`

type HistoryRow = { version: string; name: string; statements: string[] }

function parseArgs(): { command: string; env: string; out?: string } {
    const [command = '', ...rest] = process.argv.slice(2)
    let env = 'DATABASE_URL'
    let out: string | undefined
    for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '--env') env = rest[++i]
        else if (rest[i] === '--out') out = rest[++i]
    }
    return { command, env, out }
}

/**
 * Direct connection(`db.<ref>.supabase.co:5432`)은 무료 플랜에서 IPv6 전용이라 IPv4 망에서는 DNS부터 실패한다.
 * 그 모양의 URI면 같은 비밀번호로 Session pooler(`aws-1-<region>.pooler.supabase.com:5432`, user `postgres.<ref>` — 클러스터 번호는 프로젝트마다 다르다, `SUPABASE_POOLER_HOST`로 덮는다)로 바꿔 붙는다.
 */
function toPoolerUrl(raw: string, region: string): string {
    const u = new URL(raw)
    const m = /^db\.([a-z]+)\.supabase\.co$/.exec(u.hostname)
    if (!m) return raw
    u.username = `postgres.${m[1]}`
    u.hostname = process.env.SUPABASE_POOLER_HOST ?? `aws-1-${region}.pooler.supabase.com`
    u.port = '5432'
    return u.toString()
}

async function connect(envKey: string): Promise<Client> {
    const raw = process.env[envKey]
    if (!raw) throw new Error(`.env.local에 ${envKey}가 없습니다`)
    const url = toPoolerUrl(raw, process.env.SUPABASE_REGION ?? 'ap-northeast-2')
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
    await client.connect()
    return client
}

/** 파일명은 `<version>_<name>.sql` — 정렬이 곧 재생 순서 */
function historyFiles(): string[] {
    return readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.sql')).sort()
}

async function exportHistory(client: Client): Promise<void> {
    const { rows } = await client.query<HistoryRow>(
        'select version, name, statements from supabase_migrations.schema_migrations order by version',
    )
    mkdirSync(HISTORY_DIR, { recursive: true })
    let total = 0
    for (const row of rows) {
        const body = row.statements.join('\n')
        total += body.length
        writeFileSync(path.join(HISTORY_DIR, `${row.version}_${row.name}.sql`), HEADER(row.version, row.name) + body + '\n')
    }
    console.log(`exported ${rows.length} migrations, ${total} chars → ${HISTORY_DIR}`)
}

async function replayHistory(client: Client): Promise<void> {
    // 빈 프로젝트에는 히스토리 테이블 자체가 없다(CLI·MCP가 첫 적용 때 만든다) — dev와 같은 모양으로 먼저 만든다
    await client.query(`create schema if not exists supabase_migrations;
        create table if not exists supabase_migrations.schema_migrations (
            version text primary key, statements text[], name text, created_by text, idempotency_key text unique, rollback text[])`)
    const { rows } = await client.query<{ n: string }>('select count(*)::text as n from supabase_migrations.schema_migrations')
    if (rows[0].n !== '0') throw new Error(`대상에 이미 히스토리 ${rows[0].n}건이 있습니다 — 빈 프로젝트에만 재생합니다`)
    const files = historyFiles()
    for (const file of files) {
        const [version, ...nameParts] = file.replace(/\.sql$/, '').split('_')
        const name = nameParts.join('_')
        const raw = readFileSync(path.join(HISTORY_DIR, file), 'utf-8')
        const body = raw.split('\n').slice(2).join('\n') // 출처 주석 두 줄 제거
        await client.query('begin')
        try {
            await client.query(body)
            await client.query(
                'insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)',
                [version, name, [body]],
            )
            await client.query('commit')
            console.log(`ok   ${file}`)
        } catch (err) {
            await client.query('rollback')
            console.error(`FAIL ${file}`)
            throw err
        }
    }
    console.log(`replayed ${files.length} migrations`)
}

/** 두 환경에서 같은 결과여야 하는 정의들 — 순서를 고정해 텍스트 diff가 되게 한다 */
const SNAPSHOT_QUERIES: Array<[string, string]> = [
    ['functions', `select p.proname, pg_get_function_identity_arguments(p.oid) as args, md5(p.prosrc) as src, p.prosecdef, p.proconfig
        from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1, 2`],
    ['policies', `select schemaname, tablename, policyname, cmd, permissive, roles::text, qual, with_check
        from pg_policies where schemaname in ('public', 'storage') order by 1, 2, 3`],
    ['columns', `select table_name, column_name, data_type, is_nullable, column_default, is_generated, generation_expression
        from information_schema.columns where table_schema = 'public' order by 1, 2`],
    ['constraints', `select conrelid::regclass::text as tbl, conname, pg_get_constraintdef(oid) as def, convalidated
        from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2`],
    ['triggers', `select tgrelid::regclass::text as tbl, tgname, pg_get_triggerdef(oid) as def, tgenabled
        from pg_trigger where not tgisinternal and tgrelid::regclass::text not like 'pg_%' order by 1, 2`],
    ['indexes', `select schemaname, tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by 1, 2, 3`],
    ['routine_grants', `select distinct routine_name, grantee, privilege_type from information_schema.routine_privileges
        where specific_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC') order by 1, 2, 3`],
    ['table_grants', `select table_name, grantee, privilege_type from information_schema.role_table_grants
        where table_schema = 'public' and grantee in ('anon', 'authenticated') order by 1, 2, 3`],
    ['rls', `select relname, relrowsecurity, relforcerowsecurity from pg_class
        where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1`],
    ['views', `select viewname, md5(definition) as def from pg_views where schemaname = 'public' order by 1`],
    ['buckets', `select id, public, file_size_limit, allowed_mime_types from storage.buckets order by 1`],
    ['extensions', `select extname, extversion from pg_extension order by 1`],
]

async function snapshot(client: Client, out: string): Promise<void> {
    const parts: string[] = []
    for (const [label, sql] of SNAPSHOT_QUERIES) {
        const { rows } = await client.query(sql)
        parts.push(`## ${label} (${rows.length})`)
        for (const row of rows) parts.push(JSON.stringify(row))
        parts.push('')
    }
    writeFileSync(out, parts.join('\n'))
    console.log(`snapshot → ${out}`)
}

async function main(): Promise<void> {
    const { command, env, out } = parseArgs()
    const client = await connect(env)
    try {
        if (command === 'export') await exportHistory(client)
        else if (command === 'replay') await replayHistory(client)
        else if (command === 'snapshot') await snapshot(client, out ?? `snapshot-${env}.txt`)
        else throw new Error('usage: db-history.ts <export|replay|snapshot> [--env KEY] [--out 경로]')
    } finally {
        await client.end()
    }
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
