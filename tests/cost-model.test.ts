import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const {calculate,railway,neon,clerk,trigger}=createRequire(import.meta.url)('../docs/cost-model.js');
const p={agencies:1,brands:1,images:200,imageUsd:.12,scripts:40,scriptUsd:.05,landings:4,landingUsd:.3,articles:8,articleUsd:.4,otherAi:0,repairs:.2,acceptance:.7,reviewMinutes:2,hourlyReview:15,infrastructure:0,support:0,margin:.7};
describe('scenario arithmetic',()=>{
 it('matches the documented one-brand example including review',()=>{
  const r=calculate(p);expect(r.generation).toBeCloseTo(36.48);expect(r.acceptedImages).toBeCloseTo(168);expect(r.acceptedImageApiCost).toBeCloseTo(28.8/168);expect(r.review).toBeCloseTo(151.2);expect(r.revenue).toBeCloseTo(187.68/.3);
 });
 it('rejects impossible margin and acceptance and handles an empty workload',()=>{
  expect(()=>calculate({...p,margin:1})).toThrow();expect(()=>calculate({...p,acceptance:1.1})).toThrow();
  expect(calculate({...p,agencies:0}).acceptedImageApiCost).toBe(0);
 });
 it('reconciles the revised agency scenario without multiplying the independent AI allowance',()=>{
  const r=calculate({...p,brands:3,otherAi:20,imageReviewMinutes:.5,scriptReviewMinutes:2,landingReviewMinutes:10,articleReviewMinutes:15,infrastructure:320,support:100,paymentFee:.03,contingency:.2});
  expect(r.generation).toBeCloseTo(169.44);expect(r.reviewHours).toBeCloseTo(20.4);expect(r.review).toBeCloseTo(306);
  expect(r.cost).toBeCloseTo(895.44);expect(r.technology).toBeCloseTo(489.44);expect(r.reserve).toBeCloseTo(97.888);expect(r.revenue).toBeCloseTo(3316.444444);
 });
 it('does not double charge included credits and accounts for always-on database compute',()=>{
  expect(railway({days:30,memoryGb:2,cpuVcpu:.3,egressGb:20,bucketGb:0,minimum:20}).bill).toBeCloseTo(27.013312);
  expect(railway({days:30,memoryGb:0,cpuVcpu:0,egressGb:0,bucketGb:0,minimum:20}).bill).toBe(20);
  expect(neon({cu:.5,hours:720,gb:5,historyGb:5}).total).toBeCloseTo(40.91);
  const execution=trigger({runs:10000,seconds:10,minimum:10});expect(execution.usage).toBeCloseTo(3.63);expect(execution.bill).toBe(10);
 });
 it('models retained organizations separately from users and applies graduated overages',()=>{
  expect(clerk({mru:5000,mro:1000,enhanced:0}).total).toBe(1025);
  expect(clerk({mru:500,mro:100,enhanced:1}).total).toBe(125);
  expect(clerk({mru:100001,mro:1001,enhanced:0}).total).toBeCloseTo(2025.918);
 });
 it('rejects missing or invalid inputs and impossible payment-adjusted margins',()=>{
  expect(()=>calculate({...p,imageReviewMinutes:undefined,reviewMinutes:undefined})).toThrow();
  expect(()=>calculate({...p,paymentFee:.31})).toThrow();
  expect(()=>calculate({...p,images:NaN})).toThrow();
  expect(()=>calculate({...p,otherAi:-1})).toThrow();
 });
});
