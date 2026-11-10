/* Contact sheets use actual emulator captures, not the illustration sources. */
const path=require('path');
let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
const build=path.resolve(__dirname,'../build'),names=['campus','plaza','mapocho','moneda'];
(async()=>{
 for(const lang of ['en','es']){
  const sheet=await sharp({create:{width:320,height:288,channels:3,background:'#18202c'}})
   .composite(names.map((name,i)=>({input:path.join(build,'story-'+name+'-'+lang+'.png'),left:i%2*160,top:Math.floor(i/2)*144})))
   .png().toBuffer();
  await sharp(sheet).resize(640,576,{kernel:'nearest'}).png().toFile(path.join(build,'story-scenes-'+lang+'.png'));
  await sharp(path.join(build,'ending-final-'+lang+'.png')).resize(640,576,{kernel:'nearest'}).png().toFile(path.join(build,'ending-final-'+lang+'-4x.png'));
 }
 console.log('Saved actual English and Spanish story-screen contact sheets.');
})().catch(e=>{console.error(e);process.exitCode=1;});
