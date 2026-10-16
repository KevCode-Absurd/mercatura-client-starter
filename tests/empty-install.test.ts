import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
import {BrandBrainSchema} from '../src/lib/brand-brain';
import {SETTING_DEFAULTS} from '../src/lib/settings-defaults';
import {SHOWCASE, SHOWCASE_REVIEWED} from '../src/lib/sprint/showcase';
import {writerTest} from '../src/lib/learning/writers-data';
import {learningModules} from '../src/lib/learning/catalog';
describe('new client baseline',()=>{
 it('ships no generated examples or historical writer results',()=>{
  expect(SHOWCASE).toEqual([]);expect(SHOWCASE_REVIEWED).toBe(0);expect(writerTest.arms).toEqual([]);expect(writerTest.judges).toEqual([]);
 });
 it('supports an empty learning catalogue without treating it as incomplete seeded content',()=>{
  expect(learningModules).toEqual([]);
 });
 it('requires current evidence and review instead of inherited assumptions',()=>{
  expect(SETTING_DEFAULTS.planner.monthly_spend).toBe(0);expect(SETTING_DEFAULTS.checks.claims).toBe(true);expect(SETTING_DEFAULTS.brain_learning.auto).toBe(false);
  expect(BrandBrainSchema.safeParse({}).success).toBe(false);
 });
 it('ships a blank client directory and explicit mock, zero cap example',()=>{
  const names=fs.readdirSync('brands').filter(n=>n!=='.gitkeep');expect(names).toEqual([]);
  const example=fs.readFileSync('.env.example','utf8');
  for(const line of ['LLM_MODE=mock','LLM_BUDGET_USD=0','ABSOLUTE_BUDGET_USD=0','MEDIA_IMAGE_CAP=0','MEDIA_VIDEO_BUDGET_USD=0'])expect(example).toContain(line);
 });
});
