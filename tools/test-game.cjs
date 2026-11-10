const cp=require('child_process'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const bundled=path.join(process.env.USERPROFILE||'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python=process.env.GAME_PYTHON||(fs.existsSync(bundled)?bundled:'python');
for(const file of ['check-game.py','check-hud.py','check-interactions.py','check-bosses.py','check-story-vehicle.py','check-audio.py','verify-game.py']){
 const r=cp.spawnSync(python,[path.join(__dirname,file)],{cwd:root,stdio:'inherit'});
 if(r.status!==0)process.exit(r.status||1);
}
const sheets=cp.spawnSync(process.execPath,[path.join(__dirname,'story-contact-sheets.cjs')],{cwd:root,stdio:'inherit'});
if(sheets.status!==0)process.exit(sheets.status||1);
