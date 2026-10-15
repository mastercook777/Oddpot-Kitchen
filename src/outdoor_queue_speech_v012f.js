// v0.12-F: real outdoor waiters talk; no extra customers or gameplay RNG calls.
// Speech is deterministic for a given order list and restaurant clock, including reload.
export const OUTDOOR_QUEUE_LINES=Object.freeze({
 adventurer:Object.freeze(['还没轮到我？','矿车可不等人！','锅气都飘出来啦。','待会儿点份肉！']),
 family:Object.freeze(['小菌帽们饿啦。','闻着有菌汤香！','排好队，别乱跑。','先找个暖位置。']),
 regular:Object.freeze(['咕噜，真热闹！','我想吃脆脆的。','今天好多人呀！','好香，快到了！']),
 critic:Object.freeze(['好味值得等。','门前竟有长队。','希望火候不负盛名。','再看一会儿吧。']),
 stargazer:Object.freeze(['星砂都在排队。','这香气真亮呀。','夜路还长呢。','轮到我就好了。'])
});
export const OUTDOOR_QUEUE_URGENT=Object.freeze({
 adventurer:'我的矿车快开啦！',
 family:'孩子们快困啦。',
 regular:'咕噜，要排多久？',
 critic:'等待也是考验。',
 stargazer:'星砂快散尽了。'
});
function phraseHash(str){
 let h=2166136261;
 for(const c of String(str)){h^=c.codePointAt(0);h=Math.imul(h,16777619)}
 return h>>>0;
}
export function selectOutdoorQueueSpeech(orders,clock){
 if(!Array.isArray(orders)||!Number.isFinite(clock))return null;
 const waiting=orders.filter(o=>o&&o.status==='waiting'&&Number.isFinite(o.arrival)&&o.arrival<=clock).slice(0,4);
 if(!waiting.length)return null;
 const slot=Math.floor(clock/7),elapsed=clock-slot*7;
 // Quiet intervals are intentional; 4.0 seconds of speech in seven.
 if(elapsed<.65||elapsed>4.65)return null;
 const ids=waiting.map(o=>o.id).join('|');
 const offset=phraseHash(ids+'|'+slot)%waiting.length;
 const order=waiting[offset];
 const waited=clock-order.arrival;
 if(!Number.isFinite(waited)||waited<1)return null;
 const urgent=waited>=18;
 const lines=OUTDOOR_QUEUE_LINES[order.segment]||OUTDOOR_QUEUE_LINES.regular;
 const text=urgent?(OUTDOOR_QUEUE_URGENT[order.segment]||OUTDOOR_QUEUE_URGENT.regular):
  lines[phraseHash(order.id+'|'+slot+'|chat')%lines.length];
 return {id:'outdoor-'+order.id+'-'+slot,orderId:order.id,segment:order.segment,
  text,kind:urgent?'urgent':'chat',phase:Math.max(0,Math.min(1,(elapsed-.65)/4))};
}
