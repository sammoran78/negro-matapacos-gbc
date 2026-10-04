const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const candidates=[process.env.GBDK_HOME,...fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&/gbdk/i.test(d.name)).map(d=>path.join(root,d.name)),path.join(root,'.tools/gbdk')].filter(Boolean);
let home=candidates.find(p=>fs.existsSync(path.join(p,'bin/lcc.exe')));
if(!home){console.error('GBDK not found. Set GBDK_HOME or run tools/setup-gbdk.ps1.');process.exit(1);}
const lcc=path.join(home,'bin/lcc.exe'),build=path.join(root,'build');fs.mkdirSync(build,{recursive:true});
function run(args){const r=cp.spawnSync(lcc,args,{cwd:root,encoding:'utf8'});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);if(r.status!==0)process.exit(r.status||1);}
const assets=cp.spawnSync(process.execPath,[path.join(root,'tools/build-game-assets.cjs')],{cwd:root,stdio:'inherit'});if(assets.status)process.exit(assets.status);
const files=['platformer.c','ui.c',...fs.readdirSync(path.join(root,'generated')).filter(n=>n.endsWith('.c')).map(n=>'generated/'+n)];
const objects=[];
for(const file of files){const obj=path.join(build,path.basename(file,'.c')+'.o');run(['-debug','-c','-o',obj,file]);objects.push(obj);}
run(['-debug','-Wm-yC','-Wm-yo16','-Wm-yt0x19','-Wm-ynMATAPACOS','-Wl-m','-Wl-j','-o',path.join(build,'matapacos.gbc'),...objects]);
console.log('Built '+path.join(build,'matapacos.gbc')+' using '+home);
