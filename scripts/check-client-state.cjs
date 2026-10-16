const fs=require('node:fs'),path=require('node:path');
const base=process.cwd(), brands=path.resolve(base,process.env.BRANDS_DIR||'brands');
const folders=fs.existsSync(brands)?fs.readdirSync(brands,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('.')).length:0;
const mode=process.env.LLM_MODE||'mock';
console.log('Client folders: '+folders+'. Generation mode: '+mode+'.');
if(!folders)console.log('Open /onboarding to add your first client. No demonstration data is seeded.');
for(const key of ['OPENAI_API_KEY','GEMINI_API_KEY','ANTHROPIC_API_KEY','DEEPSEEK_API_KEY'])console.log(key+': '+(process.env[key]?'configured (value hidden)':'not configured'));
console.log('This local starter has no hosted authentication or active marketing account integrations. See docs/PLATFORM-IMPLEMENTATION-PLAN.md.');
