//VERSION=3
const maxObs=30;
function setup(){return{input:["SCL","dataMask"],output:[{id:"default",bands:3},{id:"index",bands:1,sampleType:"FLOAT32"},{id:"eobrowserStats",bands:2,sampleType:"FLOAT32"}],mosaicking:"ORBIT"}}function evaluatePixel(s){let c=0,m=0;for(let i=0;i<s.length;i++){if(s[i].dataMask){m=1;let l=s[i].SCL;if(l>3&&l<7||l==11)c++}}return{default:colorBlend(c/maxObs,[0,.25,.5,.75,1],[[.26,0,.32],[.22,.32,.54],[.12,.56,.55],[.36,.78,.38],[.99,.9,.14]]),index:[c],eobrowserStats:[c,m]}}
