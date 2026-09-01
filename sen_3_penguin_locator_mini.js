//VERSION=3 - AI- generated based on the Penguin locator custom script for Sentinel-3 and shortened https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/penguin_locator/
function setup(){return{input:["B04","B06","B08","B17"],output:{bands:3}}}
function evaluatePixel(s){let f=x=>Math.sqrt(.6*x)-.1,g=f(s.B06),h=x=>(8*x-1)/7;return[h(f(s.B17)),h((f(s.B08)+g)/2),h((g+f(s.B04))/2)]}
