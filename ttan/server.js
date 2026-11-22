// server.js — ttan control server v6
// run: npm i && node server.js
// env: PORT, ADMIN_SECRET, HTTPS

const express=require("express");
const {WebSocketServer}=require("ws");
const cors=require("cors");
const rateLimit=require("express-rate-limit");
const fs=require("fs");
const path=require("path");
const {v4:uuid}=require("uuid");

const PORT=process.env.PORT||7788;
const ADMIN_SECRET=process.env.ADMIN_SECRET||"change_me_please";
const DB_FILE=path.join(__dirname,"db.json");

// ═══════════════════════════════════════════
// DB — JSON file, atomic-ish write
// ═══════════════════════════════════════════
const defaultDB=()=>({
  keys:{},
  vocab:{},
  sessions:{},
  stats:{solves:0,learns:0,keysCreated:0,requests:0},
  log:[],
  createdAt:Date.now()
});

let db=defaultDB();
if(fs.existsSync(DB_FILE)){
  try{
    const loaded=JSON.parse(fs.readFileSync(DB_FILE,"utf8"));
    db=Object.assign(defaultDB(),loaded);
    db.stats=Object.assign(defaultDB().stats,loaded.stats||{});
  }catch(e){console.error("[db] load failed, using fresh:",e.message)}
}

let saveTimer=null;
const saveDB=()=>{
  if(saveTimer)return;
  saveTimer=setTimeout(()=>{
    saveTimer=null;
    try{
      const tmp=DB_FILE+".tmp";
      fs.writeFileSync(tmp,JSON.stringify(db,null,2));
      fs.renameSync(tmp,DB_FILE);
    }catch(e){console.error("[db] save failed:",e.message)}
  },200);
};

const log=(msg,type="info")=>{
  const entry={t:Date.now(),type,msg};
  db.log.push(entry);
  if(db.log.length>300)db.log.shift();
  console.log(`[${type}] ${msg}`);
  broadcast({type:"log",entry});
};

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════
const newKey=label=>{
  const key="ttan_"+uuid().replace(/-/g,"").slice(0,32);
  db.keys[key]={
    id:key,
    label:label||"untitled",
    created:Date.now(),
    active:true,
    lastSeen:null,
    stats:{solves:0,learns:0}
  };
  db.stats.keysCreated++;
  saveDB();
  log(`key created: ${label||"untitled"} (${key.slice(0,14)}…)`,"auth");
  return key;
};

const validateKey=key=>{
  const k=db.keys[key];
  return k&&k.active;
};

const revokeKey=key=>{
  if(!db.keys[key])return false;
  db.keys[key].active=false;
  db.keys[key].revokedAt=Date.now();
  saveDB();
  log(`key revoked: ${db.keys[key].label}`,"auth");
  // kick any active session
  const ws=db.sessions[key]?.ws;
  if(ws&&ws.readyState===1){try{ws.close()}catch(_){}}
  delete db.sessions[key];
  saveDB();
  return true;
};

// ═══════════════════════════════════════════
// EXPRESS
// ═══════════════════════════════════════════
const app=express();
app.set("trust proxy",1);
app.use(cors());
app.use(express.json({limit:"4mb"}));
app.use(express.static(path.join(__dirname,"public")));

// rate limits
const clientLimiter=rateLimit({
  windowMs:60*1000,
  max:300,
  message:{ok:false,error:"rate limit"},
  standardHeaders:true,
  legacyHeaders:false
});
const adminLimiter=rateLimit({
  windowMs:60*1000,
  max:120,
  message:{ok:false,error:"admin rate limit"}
});
const loginLimiter=rateLimit({
  windowMs:15*60*1000,
  max:20,
  message:{ok:false,error:"too many login attempts"}
});

// middleware
const authMw=(req,res,next)=>{
  const key=req.headers["x-ttan-key"]||req.query.key;
  if(!validateKey(key))return res.status(401).json({ok:false,error:"invalid or revoked key"});
  const k=db.keys[key];
  k.lastSeen=Date.now();
  db.stats.requests++;
  saveDB();
  req.key=key;
  req.keyMeta=k;
  next();
};

const adminMw=(req,res,next)=>{
  const secret=req.headers["x-admin-secret"]||req.query.admin;
  if(secret!==ADMIN_SECRET)return res.status(403).json({ok:false,error:"admin denied"});
  next();
};

// ═══════════════════════════════════════════
// CLIENT ROUTES (userscript)
// ═══════════════════════════════════════════
app.post("/api/auth/check",clientLimiter,authMw,(req,res)=>{
  res.json({
    ok:true,
    label:req.keyMeta.label,
    vocabCount:Object.keys(db.vocab).length,
    serverTime:Date.now()
  });
});

app.get("/api/vocab",clientLimiter,authMw,(req,res)=>{
  res.json({ok:true,vocab:db.vocab,count:Object.keys(db.vocab).length});
});

app.post("/api/vocab/learn",clientLimiter,authMw,(req,res)=>{
  const {en,vi,source}=req.body||{};
  if(!en||!vi)return res.status(400).json({ok:false,error:"missing en/vi"});
  const key=String(en).toLowerCase().trim();
  if(!key||key.length<2||key.length>80)return res.status(400).json({ok:false,error:"invalid en"});
  if(db.vocab[key]&&db.vocab[key].vi===vi)return res.json({ok:true,added:false});
  db.vocab[key]={
    vi:String(vi).trim(),
    source:source||"unknown",
    addedBy:req.key.slice(0,14),
    addedAt:Date.now()
  };
  db.stats.learns++;
  req.keyMeta.stats.learns=(req.keyMeta.stats.learns||0)+1;
  saveDB();
  log(`learn: ${key} = ${vi} (${source||"?"})`,"learn");
  broadcast({type:"vocab_update",en:key,vi});
  res.json({ok:true,added:true});
});

app.post("/api/stats/ping",clientLimiter,authMw,(req,res)=>{
  const {solves,learns,site}=req.body||{};
  if(solves){db.stats.solves+=solves;req.keyMeta.stats.solves=(req.keyMeta.stats.solves||0)+solves}
  if(learns){db.stats.learns+=learns}
  saveDB();
  broadcast({type:"stats",stats:db.stats,active:Object.keys(db.sessions).length});
  res.json({ok:true});
});

// ═══════════════════════════════════════════
// ADMIN ROUTES (panel)
// ═══════════════════════════════════════════
app.post("/api/admin/login",loginLimiter,(req,res)=>{
  const {secret}=req.body||{};
  if(secret!==ADMIN_SECRET)return res.status(403).json({ok:false,error:"wrong secret"});
  res.json({ok:true});
});

app.get("/api/admin/keys",adminLimiter,adminMw,(req,res)=>{
  res.json({ok:true,keys:db.keys});
});

app.post("/api/admin/keys",adminLimiter,adminMw,(req,res)=>{
  const {label}=req.body||{};
  const key=newKey(label);
  res.json({ok:true,key,meta:db.keys[key]});
});

app.delete("/api/admin/keys/:key",adminLimiter,adminMw,(req,res)=>{
  const ok=revokeKey(req.params.key);
  res.json({ok});
});

app.post("/api/admin/keys/:key/toggle",adminLimiter,adminMw,(req,res)=>{
  const k=db.keys[req.params.key];
  if(!k)return res.status(404).json({ok:false});
  k.active=!k.active;
  if(!k.active){
    const ws=db.sessions[req.params.key]?.ws;
    if(ws&&ws.readyState===1){try{ws.close()}catch(_){}}
    delete db.sessions[req.params.key];
  }
  saveDB();
  log(`key ${k.active?"activated":"deactivated"}: ${k.label}`,"auth");
  res.json({ok:true,active:k.active});
});

app.delete("/api/admin/keys/:key/permanent",adminLimiter,adminMw,(req,res)=>{
  if(!db.keys[req.params.key])return res.json({ok:false});
  delete db.keys[req.params.key];
  delete db.sessions[req.params.key];
  saveDB();
  res.json({ok:true});
});

app.get("/api/admin/vocab/all",adminLimiter,adminMw,(req,res)=>{
  res.json({ok:true,vocab:db.vocab,count:Object.keys(db.vocab).length});
});

app.post("/api/admin/vocab",adminLimiter,adminMw,(req,res)=>{
  const {en,vi,source}=req.body||{};
  if(!en||!vi)return res.status(400).json({ok:false,error:"missing"});
  const key=String(en).toLowerCase().trim();
  db.vocab[key]={
    vi:String(vi).trim(),
    source:source||"admin",
    addedBy:"admin",
    addedAt:Date.now()
  };
  saveDB();
  log(`admin add: ${key} = ${vi}`,"vocab");
  broadcast({type:"vocab_update",en:key,vi});
  res.json({ok:true});
});

app.delete("/api/admin/vocab/:en",adminLimiter,adminMw,(req,res)=>{
  const key=String(req.params.en).toLowerCase().trim();
  if(db.vocab[key]){delete db.vocab[key];saveDB();broadcast({type:"vocab_delete",en:key})}
  res.json({ok:true});
});

app.post("/api/admin/vocab/bulk",adminLimiter,adminMw,(req,res)=>{
  const {pairs}=req.body||{};
  if(!Array.isArray(pairs))return res.status(400).json({ok:false,error:"pairs must be array"});
  let added=0,skipped=0;
  for(const p of pairs){
    if(!p||!p.en||!p.vi){skipped++;continue}
    const key=String(p.en).toLowerCase().trim();
    if(!key||key.length<2){skipped++;continue}
    db.vocab[key]={vi:String(p.vi).trim(),source:p.source||"bulk",addedBy:"admin",addedAt:Date.now()};
    added++;
  }
  saveDB();
  log(`bulk add: ${added} pairs`,"vocab");
  broadcast({type:"vocab_bulk",count:added});
  res.json({ok:true,added,skipped});
});

app.get("/api/admin/stats",adminLimiter,adminMw,(req,res)=>{
  res.json({
    ok:true,
    stats:db.stats,
    activeSessions:Object.keys(db.sessions).length,
    vocabCount:Object.keys(db.vocab).length,
    keyCount:Object.keys(db.keys).length,
    uptime:Math.floor(process.uptime())
  });
});

app.get("/api/admin/log",adminLimiter,adminMw,(req,res)=>{
  res.json({ok:true,log:db.log.slice(-200)});
});

app.post("/api/admin/export",adminLimiter,adminMw,(req,res)=>{
  res.json({ok:true,data:{vocab:db.vocab,keys:db.keys,stats:db.stats,exportedAt:Date.now()}});
});

app.post("/api/admin/import",adminLimiter,adminMw,(req,res)=>{
  const {vocab,pairs,merge=true}=req.body||{};
  let n=0;
  if(vocab&&typeof vocab==="object"){
    for(const en in vocab){
      if(!merge&&db.vocab[en])continue;
      db.vocab[en]=vocab[en];n++;
    }
  }
  if(Array.isArray(pairs)){
    for(const p of pairs){
      if(!p.en||!p.vi)continue;
      if(!merge&&db.vocab[p.en])continue;
      db.vocab[String(p.en).toLowerCase().trim()]={vi:p.vi,source:"import",addedBy:"admin",addedAt:Date.now()};n++;
    }
  }
  saveDB();
  log(`import: ${n} pairs`,"vocab");
  res.json({ok:true,imported:n});
});

// ═══════════════════════════════════════════
// WEBSOCKET
// ═══════════════════════════════════════════
const server=app.listen(PORT,()=>{
  console.log("\n═══════════════════════════════════════");
  console.log(`  ttan server @ http://localhost:${PORT}`);
  console.log(`  panel      @ http://localhost:${PORT}/panel.html`);
  console.log(`  admin      @ ${ADMIN_SECRET==="change_me_please"?"⚠️  default 'change_me_please' — SET ADMIN_SECRET ENV!":"set"}`);
  console.log(`  db         @ ${DB_FILE}`);
  console.log("═══════════════════════════════════════\n");
  if(Object.keys(db.keys).length===0){
    const k=newKey("default");
    console.log("⚡ FIRST BOOT — client key:");
    console.log("   "+k);
    console.log("   (save this, it won't show again)\n");
  }
});

const wss=new WebSocketServer({server});

const broadcast=msg=>{
  const data=JSON.stringify(msg);
  wss.clients.forEach(c=>{if(c.readyState===1)try{c.send(data)}catch(_){}});
};

wss.on("connection",(ws,req)=>{
  ws.isAlive=true;
  ws.key=null;
  ws.isAdmin=false;
  ws.on("pong",()=>{ws.isAlive=true});

  ws.on("message",raw=>{
    let msg;try{msg=JSON.parse(raw)}catch(_){return}
    const t=msg.type;

    if(t==="auth"){
      if(!validateKey(msg.key)){
        try{ws.send(JSON.stringify({type:"auth_fail",error:"invalid or revoked key"}))}catch(_){}
        return ws.close();
      }
      ws.key=msg.key;
      ws.clientInfo=msg.clientInfo||{};
      db.keys[msg.key].lastSeen=Date.now();
      db.sessions[msg.key]={lastPing:Date.now(),clientInfo:ws.clientInfo,ws};
      saveDB();
      ws.send(JSON.stringify({
        type:"auth_ok",
        vocab:db.vocab,
        vocabCount:Object.keys(db.vocab).length,
        label:db.keys[msg.key].label
      }));
      log(`client connected: ${db.keys[msg.key].label} @ ${ws.clientInfo.site||"?"}`,"ws");
    }
    else if(t==="admin_auth"){
      if(msg.secret!==ADMIN_SECRET){
        try{ws.send(JSON.stringify({type:"admin_fail"}))}catch(_){}
        return ws.close();
      }
      ws.isAdmin=true;
      ws.send(JSON.stringify({
        type:"admin_ok",
        stats:db.stats,
        vocabCount:Object.keys(db.vocab).length,
        activeSessions:Object.keys(db.sessions).length
      }));
    }
    else if(t==="ping"){
      try{ws.send(JSON.stringify({type:"pong",t:Date.now()}))}catch(_){}
    }
    else if(t==="learn"&&ws.key&&validateKey(ws.key)){
      const {en,vi,source}=msg;
      if(en&&vi){
        const k=String(en).toLowerCase().trim();
        if(!db.vocab[k]||db.vocab[k].vi!==vi){
          db.vocab[k]={vi:String(vi).trim(),source:source||"ws",addedBy:ws.key.slice(0,14),addedAt:Date.now()};
          db.stats.learns++;
          saveDB();
          broadcast({type:"vocab_update",en:k,vi});
        }
      }
    }
  });

  ws.on("close",()=>{
    if(ws.key&&db.sessions[ws.key]){
      delete db.sessions[ws.key];
      saveDB();
    }
  });
});

const interval=setInterval(()=>{
  wss.clients.forEach(ws=>{
    if(!ws.isAlive)return ws.terminate();
    ws.isAlive=false;
    try{ws.ping()}catch(_){}
  });
},30000);
wss.on("close",()=>clearInterval(interval));

process.on("SIGINT",()=>{
  console.log("\n[shutdown] saving db...");
  try{fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2))}catch(_){}
  process.exit(0);
});
process.on("SIGTERM",()=>{
  try{fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2))}catch(_){}
  process.exit(0);
});
