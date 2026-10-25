import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const schema=readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

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
