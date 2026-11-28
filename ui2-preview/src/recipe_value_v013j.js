// The award is for a well-executed version of this particular recipe;
// a named style still needs its own recipe-specific pairing to change price.
export function qualityPriceBonus(quality){
 if(quality>=90)return 7;
 if(quality>=85)return 5;
 if(quality>=80)return 2;
 return 0;
}

export function craftedPrice(recipe,quality,pair){
 // A signature is awarded only by an authored recipe × technique pairing.
 return recipe.price+(pair?.priceDeltaCoins||0)+(pair?.affinity==='signature'?2:0)+qualityPriceBonus(quality);
}
