const fs=require('node:fs'),cp=require('node:child_process');
const files=cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
if(!files.length)throw new Error('No tracked files: initialize this fresh repository and stage source first.');
const forbidden=/^(?:data|uploads|output|backup|node_modules|\.next[^/]*|\.test-tmp)\/|^brands\/(?!\.gitkeep$)|^\.env(?!\.example$)|\.(?:db|sqlite(?:3)?|pem|key|p12|pfx|har)$/i;
const secret=/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|AIza[0-9A-Za-z_-]{25,}|gh[pousr]_[A-Za-z0-9_]{25,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/;
const problems=[];
for(const file of files){
 if(forbidden.test(file))problems.push(file+': runtime or secret file is tracked');
 if(fs.statSync(file).size>2*1024*1024)problems.push(file+': large bundled file requires review');
 if(/\.(?:[cm]?[jt]sx?|json|md|sql|ya?ml|txt|html|css|env|example)$/.test(file)){
  const value=fs.readFileSync(file,'utf8');
  if(secret.test(value))problems.push(file+': credential-shaped value');
  if(/(?:C:[\\/]Users[\\/]|file:\/\/\/C:)/i.test(value))problems.push(file+': workstation path');
 }
}
if(problems.length){console.error(problems.join('\n'));process.exit(1);}
console.log('Tracked source integrity passed ('+files.length+' files). Private client fingerprint audit is a separate export-time check.');
