import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const schema=readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const upgrade=readFileSync(new URL('../supabase/upgrade_v02.sql',import.meta.url),'utf8');
const deleteAccount=readFileSync(new URL('../supabase/functions/delete-account/index.ts',import.meta.url),'utf8');

test('HTML contains entrypoint and mobile viewport',()=>{
  assert.match(html,/src\/app\.js/);
  assert.match(html,/viewport-fit=cover/);
});
test('demo contains no credential and backend configuration is separate',()=>{
  assert.match(app,/const configured = Boolean/);
  assert.doesNotMatch(app,/service_role|sb_secret_/i);
});
test('SQL enables RLS for all community tables',()=>{
  for(const table of ['profiles','trees','tree_photos','likes','comments'])
    assert.ok(schema.includes('alter table public.'+table+' enable row level security;'));
});
test('photo hard-size limit specified in bucket',()=>{
  assert.match(schema,/1000000,array\['image\/jpeg'\]/);
});
test('location precision and upload protection are present',()=>{
  assert.match(app,/location_precision/);
  assert.match(schema,/may_upload_photo/);
});

test('community reporting is protected by RLS',()=>{
  assert.match(upgrade,/alter table public\.reports enable row level security/i);
  assert.match(upgrade,/read own reports/i);
  assert.match(upgrade,/submit own report/i);
  assert.match(upgrade,/grant select,insert on public\.reports to authenticated/i);
  assert.doesNotMatch(upgrade,/grant .*reports to anon/i);
});
test('owners can delete their own tree but not a different owner\'s tree',()=>{
  assert.match(upgrade,/for delete to authenticated[\s\S]*?auth\.uid\(\)\) = owner_id/i);
  assert.match(app,/t\.owner_id!==state\.user\.id/);
  assert.match(app,/storage\.from\('tree-photos'\)\.remove\(paths\)/);
});
test('real daily featured tree and private content reports are implemented',()=>{
  assert.match(app,/function dailyTree\(\)/);
  assert.match(app,/function reportDialog\(\)/);
  assert.match(app,/async function submitReport\(form\)/);
  assert.match(app,/escapeHtml\(c\.body\)/);
});
test('account deletion function authenticates bearer JWT and deletes photos first',()=>{
  assert.match(deleteAccount,/admin\.auth\.getUser\(accessToken\)/);
  assert.match(deleteAccount,/admin\.storage\.from\("tree-photos"\)\.remove/);
  assert.match(deleteAccount,/admin\.auth\.admin\.deleteUser\(prefix\)/);
  assert.doesNotMatch(deleteAccount,/user_id\s*:\s*body/);
  assert.doesNotMatch(app,/SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});
