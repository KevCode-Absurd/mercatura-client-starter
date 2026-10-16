(function(root){
  function calculate(p){
    const values=Object.values(p);
    if(values.some(v=>!Number.isFinite(v)||v<0)||p.margin>=1||p.acceptance>1)throw new Error('Use non-negative finite inputs; margin must be below 100% and acceptance at most 100%.');
    const brands=p.agencies*p.brands;
    const initialPerBrand=p.images*p.imageUsd+p.scripts*p.scriptUsd+p.landings*p.landingUsd+p.articles*p.articleUsd+p.otherAi;
    const attempts=1+p.repairs;
    const generation=brands*initialPerBrand*attempts;
    const review=brands*(p.images+p.scripts+p.landings+p.articles)*attempts*p.reviewMinutes/60*p.hourlyReview;
    const acceptedImages=brands*Math.min(p.images,p.images*attempts*p.acceptance);
    const imageCost=brands*p.images*p.imageUsd*attempts;
    const cost=generation+review+p.infrastructure+p.support;
    return {brands,generation,review,cost,acceptedImages,acceptedImageApiCost:acceptedImages?imageCost/acceptedImages:0,revenue:cost/(1-p.margin)};
  }
  if(typeof module!=='undefined')module.exports={calculate};
  else root.MercaturaCosts={calculate};
})(typeof globalThis==='undefined'?this:globalThis);
