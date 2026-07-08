//VERSION=3 a short version of https://custom-scripts.sentinel-hub.com/landsat-8/land_surface_temperature_mapping/ by @azlinszky and Google Gemini
let b="B10",m=0,M=50,ns=.2,nv=.8;
let v=ColorRampVisualizer.createRedTemperature(m,M);
function setup(){return{input:[{bands:["B03","B04","B05","B10","B11"]}],mosaicking:"ORBIT",output:{bands:3}}}
function E(n,p){return n<0?.991:n<ns?.966:n>nv?.973:.973*p+.966*(1-p)+.009}
function evaluatePixel(s){
let a=0,n=s.length,c=b=="B10"?10895e-9:12005e-9;
for(let k of s){
let B=k[b];
if(B>173&&B<65000&&k.B03>0&&k.B04>0&&k.B05>0){
let t=B-273.15,nd=(k.B05-k.B04)/(k.B05+k.B04);
a+=t/(1+c*t/.01438*Math.log(E(nd,((nd-ns)/(nv-ns))**2)))}else n--}
return v.process(a/n)}
