(function(root){
  function valid(p){
    if(Object.values(p).some(v=>!Number.isFinite(v)||v<0))throw new Error('Use non-negative finite numeric inputs.');
  }
  function calculate(p){
    const required=['agencies','brands','images','imageUsd','scripts','scriptUsd','landings','landingUsd','articles','articleUsd','otherAi','repairs','acceptance','hourlyReview','infrastructure','support','margin'];
    if(required.some(k=>!Number.isFinite(p[k])))throw new Error('Complete all workload and cost fields.');
    valid(p);
    const paymentFee=p.paymentFee??0, contingency=p.contingency??0;
    if(p.margin+paymentFee>=1||p.acceptance>1)throw new Error('Margin plus payment fee must be below 100%; acceptance must be at most 100%.');
    const brands=p.agencies*p.brands;
    const initialPerBrand=p.images*p.imageUsd+p.scripts*p.scriptUsd+p.landings*p.landingUsd+p.articles*p.articleUsd;
    const attempts=1+p.repairs;
    const baseGeneration=brands*initialPerBrand*attempts;
    const otherAi=brands*p.otherAi;
    const generation=baseGeneration+otherAi;
    const minutes=['image','script','landing','article'].map(k=>p[k+'ReviewMinutes']??p.reviewMinutes);
    if(minutes.some(v=>!Number.isFinite(v)))throw new Error('Complete review time for every format.');
    const reviewHours=brands*(p.images*minutes[0]+p.scripts*minutes[1]+p.landings*minutes[2]+p.articles*minutes[3])*attempts/60;
    const review=reviewHours*p.hourlyReview;
    const acceptedImages=brands*Math.min(p.images,p.images*attempts*p.acceptance);
    const imageCost=brands*p.images*p.imageUsd*attempts;
    const cost=generation+review+p.infrastructure+p.support;
    const technology=p.infrastructure+generation;
    const reserve=technology*contingency;
    return {brands,baseGeneration,otherAi,generation,technology,reviewHours,review,cost,reserve,cashBudget:cost+reserve,acceptedImages,acceptedImageApiCost:acceptedImages?imageCost/acceptedImages:0,revenue:cost/(1-p.margin-paymentFee)};
  }
  function railway(p){
    valid(p);
    const seconds=p.days*24*60*60;
    const usage=seconds*(p.memoryGb*0.00000386+p.cpuVcpu*0.00000772)+p.egressGb*0.05+p.bucketGb*0.015;
    return {usage,bill:Math.max(p.minimum,usage)};
  }
  function neon(p){
    valid(p);
    const compute=p.cu*p.hours*0.106,storage=p.gb*0.35,history=p.historyGb*0.20;
    return {compute,storage,history,total:compute+storage+history};
  }
  function banded(quantity,bands){
    let charge=0,previous=0;
    for(const [limit,rate] of bands){charge+=Math.max(0,Math.min(quantity,limit)-previous)*rate;previous=limit;}
    return charge;
  }
  function clerk(p){
    valid(p);
    const users=banded(p.mru,[[50000,0],[100000,.02],[1000000,.018],[10000000,.015],[Infinity,.012]]);
    const orgs=banded(p.mro,[[100,0],[1000,1],[10000,.9],[100000,.75],[Infinity,.6]]);
    const b2b=(p.enhanced>0||p.mro>100)?100:0;
    return {base:25,b2b,users,orgs,total:25+b2b+users+orgs};
  }
  function trigger(p){
    valid(p);
    const usage=p.runs*(p.seconds*0.0000338+0.000025);
    return {usage,bill:Math.max(p.minimum,usage)};
  }
  const api={calculate,railway,neon,clerk,trigger};
  if(typeof module!=='undefined')module.exports=api;
  else root.MercaturaCosts=api;
})(typeof globalThis==='undefined'?this:globalThis);
