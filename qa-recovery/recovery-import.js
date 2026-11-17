(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.EOSQaRecovery=factory();})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const key='act1_schema2_99990001',archiveKey='qa-recovery-import:v1:99990001:previous',schema='eos503-private-qa-recovery/v1';
 const fail=message=>{throw Error(message);};
 const allowedLocation=l=>(l.origin==='https://eldotpipilo.github.io'&&/^\/EOS-503-Playtest\/qa-recovery\/(?:index\.html)?$/.test(l.pathname))||(['http://127.0.0.1','http://localhost'].some(v=>l.origin===v||l.origin.startsWith(v+':'))&&/^\/EOS-503-Playtest\/qa-recovery\/(?:index\.html)?$/.test(l.pathname));
 async function sha(text,subtle){const bytes=new Uint8Array(await subtle.digest('SHA-256',new TextEncoder().encode(text)));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
 async function validate(text,pin,subtle){
  if(typeof text!=='string'||text.length>20000000)fail('This is not the prepared QA recovery file.');
  let p;try{p=JSON.parse(text);}catch{fail('This is not the prepared QA recovery file.');}
  if(!p||p.schema!==schema||p.participantId!=='99990001'||p.sourceCsvSha256!==pin.sourceCsvSha256||p.sourceBytes!==pin.sourceBytes||p.rows!==10186||p.columns!==85||typeof p.backup!=='string'||!/^EOS503:GZIPCSV:1:[A-Za-z0-9+/]+={0,2}$/.test(p.backup))fail('Only the prepared completed 99990001 QA run is accepted.');
  if(await sha(p.backup,subtle)!==pin.backupSha256)fail('The QA recovery file does not match the verified completed run.');
  return p;
 }
 function layout(db){
  const info={version:db.version,storeCount:db.objectStoreNames.length,expectedStorePresent:db.objectStoreNames.contains('CSVBackups'),compatible:false};
  if(info.expectedStorePresent){const store=db.transaction('CSVBackups','readonly').objectStore('CSVBackups');info.expectedKeyPath=store.keyPath==='id';info.autoIncrement=store.autoIncrement;info.compatible=info.version===1&&info.expectedKeyPath&&!info.autoIncrement;}
  info.code=info.compatible?'QA-STORAGE-READY':info.version!==1?'QA-STORAGE-VERSION':!info.expectedStorePresent?(info.storeCount===0?'QA-STORAGE-EMPTY':'QA-STORAGE-OTHER-LAYOUT'):'QA-STORAGE-STORE-SHAPE';
  return info;
 }
 function layoutError(info){const error=Error(info.code+': This browser profile has an incompatible test database. Its contents were preserved. Use a separate regular Chrome or Edge profile for this QA test; do not clear your current profile or use Guest/Incognito.');error.code=info.code;return error;}
 // Inspect schema only. Abort creation if absent, so this read-only diagnostic
 // cannot itself leave an empty version-1 database that blocks the game.
 function inspect(indexedDB){return new Promise((resolve,reject)=>{
  let request,absent=false,settled=false;const timer=setTimeout(()=>done(Error('Storage is busy. Close test game tabs and try again.')),10000);
  function done(error,value){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);}
  try{request=indexedDB.open('DataCollectionDB');}catch{done(Error('This browser could not inspect test storage.'));return;}
  request.onupgradeneeded=()=>{absent=true;request.transaction.abort();};
  request.onerror=()=>absent?done(null,{code:'QA-STORAGE-ABSENT',compatible:true,version:null,storeCount:0,expectedStorePresent:false}):done(Error('This browser could not inspect test storage.'));
  request.onblocked=()=>done(Error('Storage is busy. Close test game tabs and try again.'));
  request.onsuccess=()=>{const db=request.result;try{done(null,layout(db));}catch{done(Error('Could not inspect the test storage layout. No data was changed.'));}finally{db.close();}};
 });}
 function open(indexedDB){return new Promise((resolve,reject)=>{
  let request,settled=false;const timer=setTimeout(()=>done(Error('Storage is busy. Close game tabs and try again.')),10000);
  function done(error,db){if(settled){if(db)db.close();return;}settled=true;clearTimeout(timer);error?reject(error):resolve(db);}
  try{request=indexedDB.open('DataCollectionDB',1);}catch{done(Error('This browser could not open test storage.'));return;}
  request.onupgradeneeded=()=>{if(settled){request.transaction.abort();return;}const db=request.result;if(!db.objectStoreNames.contains('CSVBackups'))db.createObjectStore('CSVBackups',{keyPath:'id'});};
  request.onerror=()=>done(request.error&&request.error.name==='VersionError'?layoutError({code:'QA-STORAGE-VERSION'}):Error('This browser could not open test storage.'));
  request.onblocked=()=>done(Error('Storage is busy. Close game tabs and try again.'));
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();try{const info=layout(db);if(!info.compatible){db.close();done(layoutError(info));}else done(null,db);}catch{db.close();done(Error('Could not verify the test storage layout. No data was changed.'));}};
 });}
 function read(db,id){return new Promise((resolve,reject)=>{const tx=db.transaction('CSVBackups','readonly'),request=tx.objectStore('CSVBackups').get(id);let value;request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(Error('Could not read test storage.'));});}
 function mutate(db,mode,p,confirmed){return new Promise((resolve,reject)=>{
  if(confirmed!==true){reject(Error('First confirm that all test game tabs are closed.'));return;}
  const tx=db.transaction('CSVBackups','readwrite'),store=tx.objectStore('CSVBackups');let result,error;
  function abort(message){error=message;tx.abort();}
  const request=store.get(archiveKey);request.onsuccess=()=>{
   const archive=request.result;
   if(archive&&(archive.schema!==schema||archive.target!==key||typeof archive.hadPrevious!=='boolean'||archive.hadPrevious&&(!archive.previous||archive.previous.id!==key))){abort('Unexpected preserved backup. No data was changed.');return;}
   if(mode==='restore'){
    if(!archive){abort('There is no preserved backup to restore.');return;}
    if(archive.hadPrevious)store.put(archive.previous);else store.delete(key);
    store.delete(archiveKey);result={restored:true,previousExisted:archive.hadPrevious};return;
   }
   if(!p||p.schema!==schema||p.participantId!=='99990001'){abort('Prepared QA file required.');return;}
   const current=store.get(key);current.onsuccess=()=>{
    if(!archive)store.add({id:archiveKey,schema,target:key,hadPrevious:current.result!==undefined,previous:current.result===undefined?null:current.result,createdUtc:new Date().toISOString()});
    store.put({id:key,csv:p.backup});result={installed:true,previousPreserved:archive?archive.hadPrevious:current.result!==undefined};
   };
  };
  tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(Error(error||'Test storage write failed. The transaction was rolled back.'));
 });}
 return Object.freeze({key,archiveKey,schema,allowedLocation,sha,validate,inspect,open,read,install:(db,p,confirmed)=>mutate(db,'install',p,confirmed),restore:(db,confirmed)=>mutate(db,'restore',null,confirmed)});
});
