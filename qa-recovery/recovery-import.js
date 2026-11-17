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
 function open(indexedDB){return new Promise((resolve,reject)=>{
  let request,settled=false;const timer=setTimeout(()=>done(Error('Storage is busy. Close game tabs and try again.')),10000);
  function done(error,db){if(settled){if(db)db.close();return;}settled=true;clearTimeout(timer);error?reject(error):resolve(db);}
  try{request=indexedDB.open('DataCollectionDB',1);}catch{done(Error('This browser could not open test storage.'));return;}
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('CSVBackups'))db.createObjectStore('CSVBackups',{keyPath:'id'});};
  request.onerror=()=>done(Error('This browser could not open test storage.'));
  request.onblocked=()=>done(Error('Storage is busy. Close game tabs and try again.'));
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();if(!db.objectStoreNames.contains('CSVBackups')){db.close();done(Error('Unexpected test storage layout. No data was changed.'));}else done(null,db);};
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
 return Object.freeze({key,archiveKey,schema,allowedLocation,sha,validate,open,read,install:(db,p,confirmed)=>mutate(db,'install',p,confirmed),restore:(db,confirmed)=>mutate(db,'restore',null,confirmed)});
});
