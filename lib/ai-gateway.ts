import {generateText} from 'ai';
export async function generateMarketingText(instructions:string,prompt:string,maxOutputTokens=4200){
 const model=process.env.AI_GATEWAY_MODEL||'nvidia/nemotron-3.5-lightning-free';
 if(!model.includes('/'))throw new Error('Invalid AI Gateway model ID');
 try{
  const result=await generateText({model,system:instructions,prompt,temperature:0.4,maxOutputTokens,abortSignal:AbortSignal.timeout(38000)});
  if(!result.text?.trim())throw Error('AI returned empty content.');
  return result.text.trim();
 }catch(e){
  const message=e instanceof Error?e.message:String(e);
  if(/verification_required|insufficient_funds|quota_for_entity|No credits|403|402/i.test(message))throw Error('AI Gateway requires account verification or available free credits. Check Vercel AI Gateway. No paid billing was enabled automatically.');
  throw new Error('AI Gateway: '+message);
 }
}
export function parseAIJson(input:string):any{
 const clean=input.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
 try{return JSON.parse(clean)}catch{}
 const first=clean.indexOf('{'),last=clean.lastIndexOf('}');
 if(first>=0&&last>first){try{return JSON.parse(clean.slice(first,last+1))}catch{}}
 return {reply:input.slice(0,6000)};
}
