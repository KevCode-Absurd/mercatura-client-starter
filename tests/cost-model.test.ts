import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const {calculate}=createRequire(import.meta.url)('../docs/cost-model.js');
const p={agencies:1,brands:1,images:200,imageUsd:.12,scripts:40,scriptUsd:.05,landings:4,landingUsd:.3,articles:8,articleUsd:.4,otherAi:0,repairs:.2,acceptance:.7,reviewMinutes:2,hourlyReview:15,infrastructure:0,support:0,margin:.7};
describe('scenario arithmetic',()=>{
 it('matches the documented one-brand example including review',()=>{
  const r=calculate(p);expect(r.generation).toBeCloseTo(36.48);expect(r.acceptedImages).toBeCloseTo(168);expect(r.acceptedImageApiCost).toBeCloseTo(28.8/168);expect(r.review).toBeCloseTo(151.2);expect(r.revenue).toBeCloseTo(187.68/.3);
 });
 it('rejects impossible margin and acceptance and handles an empty workload',()=>{
  expect(()=>calculate({...p,margin:1})).toThrow();expect(()=>calculate({...p,acceptance:1.1})).toThrow();
  expect(calculate({...p,agencies:0}).acceptedImageApiCost).toBe(0);
 });
});
