import {generateText} from 'ai';
import {decrypt,userDb} from './server';

export async function generateMarketingText(instructions:string,prompt:string,maxOutputTokens=4200,req?:Request){
 let key=process.env.GEMINI_API_KEY||'', model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
 if(req){
  const {data,error}=await userDb(req).from('omnipost_user_ai_settings').select('key_ciphertext,model').maybeSingle();
  if(error)throw Error('Could not load AI settings. Please reconnect your Gemini key in Settings.');
  if(data?.key_ciphertext){key=decrypt(data.key_ciphertext);model=data.model||model;}
 }
 if(key){
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
   body:JSON.stringify({systemInstruction:{parts:[{text:instructions}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.45,maxOutputTokens,responseMimeType:'application/json'}}),
   signal:AbortSignal.timeout(38000)
  });
  let result:any={};try{result=await response.json()}catch{}
  if(!response.ok){
   if(response.status===429)throw Error('Your Gemini free-tier limit has been reached. Check your quota in Google AI Studio and try again later.');
   if(response.status===400||response.status===401||response.status===403)throw Error('Gemini rejected this key or model. Review your AI connection in Settings.');
   throw Error('Gemini API request failed: '+String(result.error?.message||response.status).slice(0,220));
  }
  const text=result.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('');
  if(!text?.trim())throw Error('Gemini returned an empty answer. Try a shorter prompt.');
  return text.trim();
 }
 if(process.env.AI_GATEWAY_ENABLED==='true'){
  try{
   const model=process.env.AI_GATEWAY_MODEL||'nvidia/nemotron-3.5-lightning-free';
   const result=await generateText({model,system:instructions,prompt,temperature:0.4,maxOutputTokens,abortSignal:AbortSignal.timeout(38000)});
   if(!result.text?.trim())throw Error('AI returned empty content.');
   return result.text.trim();
  }catch(e){
   const msg=e instanceof Error?e.message:String(e);
   if(/credit card|verification_required|insufficient_funds|quota|402|403/i.test(msg))throw Error('Vercel AI Gateway requires account verification or credits. Switch to a Gemini Free Tier key in Settings to avoid the Vercel credit-card requirement.');
   throw Error('AI Gateway error: '+msg.slice(0,240));
  }
 }
 throw Error('Connect a Google Gemini Free Tier API key in Settings → AI connection. No Vercel credit card is needed for eligible free-tier API usage.');
}
export function parseAIJson(input:string):any{
 const clean=input.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
 try{return JSON.parse(clean)}catch{}
 const first=clean.indexOf('{'),last=clean.lastIndexOf('}');
 if(first>=0&&last>first){try{return JSON.parse(clean.slice(first,last+1))}catch{}}
 return {reply:input.slice(0,6000)};
}
